/**
 * Serviço de Curadoria de PLs
 * Combina API da Câmara + Web Scraping + Análise com IA
 * para selecionar os PLs mais relevantes para os cidadãos
 */

import camaraAPIService from './camara-api.service';
import plScraperService, { TrendingPL } from './pl-scraper.service';
import openaiService from './openai.service';
import type { ProposicaoBasica, ProposicaoDetalhada, Autor } from './camara-api.service';

interface RelevanceImpact {
  impactScore: number; // 0-10
  areas: string[]; // ['saúde', 'educação', etc]
  affectsCitizen: boolean;
  urgency: 'high' | 'medium' | 'low';
  reasoning: string;
  localRelevance?: boolean;
}

interface RelevanceAnalysis {
  score: number; // 0-100
  shouldShow: boolean;
  impact: RelevanceImpact;
}

interface CuratedPL {
  // Dados básicos
  id: number;
  numero: string;
  ano: string;
  siglaTipo: string;
  ementa: string;
  ementaDetalhada?: string;
  
  // Status e tramitação
  status: string;
  situacao: string;
  regime?: string;
  dataApresentacao: string;
  
  // Autores
  autores: Autor[];
  
  // Análise de relevância
  relevanceScore: number;
  impact: RelevanceImpact;
  isTrending: boolean;
  trendingSources?: string[];
  
  // Conteúdo processado para cidadão
  citizenSummary: string;
  
  // Votação
  votingDate?: string;
  hasVotacao: boolean;
  
  // URLs
  urlInteiroTeor?: string;
  urlCamara: string;
}

interface CurationFilters {
  minRelevanceScore?: number;
  areas?: string[];
  urgencyLevels?: ('high' | 'medium' | 'low')[];
  onlyTrending?: boolean;
  limit?: number;
}

class PLCurationService {
  /**
   * Pipeline completo de curadoria de PLs
   */
  async curatePLsForWeek(filters?: CurationFilters): Promise<CuratedPL[]> {
    console.log('🎯 Iniciando curadoria semanal de PLs...');

    try {
      // ETAPA 1: Busca PLs recentes da API oficial
      const { dados: recentPLs } = await camaraAPIService.fetchRecentPLs(100);
      console.log(`✅ ${recentPLs.length} PLs encontrados na API da Câmara`);

      // ETAPA 2: Scraping de PLs em destaque na mídia
      const trendingPLs = await plScraperService.scrapeTrendingPLs();
      console.log(`✅ ${trendingPLs.length} PLs em destaque encontrados`);

      // ETAPA 3: Processa cada PL em paralelo (limitado)
      // Limita a 20 PLs para evitar timeout e custos excessivos
      const plsToProcess = recentPLs.slice(0, 20);
      
      const results = await Promise.allSettled(
        plsToProcess.map((pl) => this.processPL(pl, trendingPLs))
      );

      const curatedPLs: CuratedPL[] = results
        .filter((result): result is PromiseFulfilledResult<CuratedPL> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map((result) => result.value)
        .filter((curated) => this.matchesFilters(curated, filters));

      // ETAPA 4: Ordena por relevância
      const sortedPLs = curatedPLs
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, filters?.limit || 10);

      console.log(`🎯 Curadoria concluída: ${sortedPLs.length} PLs selecionados`);
      
      return sortedPLs;

    } catch (error) {
      console.error('❌ Erro na curadoria de PLs:', error);
      throw error;
    }
  }

  /**
   * Processa um PL individual
   */
  private async processPL(
    pl: ProposicaoBasica,
    trendingPLs: TrendingPL[]
  ): Promise<CuratedPL | null> {
    try {
      // Busca detalhes completos
      const { detalhes, autores, votacoes } = await camaraAPIService.fetchProposicaoCompleta(pl.id);

      // Verifica se está em trending
      const plNumber = `${pl.numero}/${pl.ano}`;
      const trending = trendingPLs.filter((t) => t.plNumber === plNumber);
      const isTrending = trending.length > 0;

      // Análise de relevância com IA
      const relevanceAnalysis = await this.calculateRelevance(detalhes, autores, isTrending);

      // Se não é relevante, pula
      if (!relevanceAnalysis.shouldShow) {
        return null;
      }

      // Gera resumo para cidadão
      const citizenSummary = await this.generateCitizenSummary(detalhes);

      // Monta PL curado
      const curatedPL: CuratedPL = {
        id: pl.id,
        numero: pl.numero.toString(),
        ano: pl.ano.toString(),
        siglaTipo: pl.siglaTipo,
        ementa: pl.ementa,
        ementaDetalhada: detalhes.ementaDetalhada,
        
        status: detalhes.statusProposicao.descricaoTramitacao,
        situacao: detalhes.statusProposicao.descricaoSituacao,
        regime: detalhes.statusProposicao.regime,
        dataApresentacao: detalhes.dataApresentacao,
        
        autores,
        
        relevanceScore: relevanceAnalysis.score,
        impact: relevanceAnalysis.impact,
        isTrending,
        trendingSources: trending.map((t) => t.source),
        
        citizenSummary,
        
        hasVotacao: votacoes.length > 0,
        votingDate: votacoes[0]?.data,
        
        urlInteiroTeor: detalhes.urlInteiroTeor,
        urlCamara: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${pl.id}`,
      };

      return curatedPL;

    } catch (error) {
      console.error(`Erro ao processar PL ${pl.id}:`, error);
      return null;
    }
  }

  /**
   * Calcula relevância usando IA
   */
  private async calculateRelevance(
    pl: ProposicaoDetalhada,
    autores: Autor[],
    isTrending: boolean
  ): Promise<RelevanceAnalysis> {
    try {
      const prompt = `
        Analise este Projeto de Lei brasileiro e determine sua relevância para o cidadão comum.

        **PL ${pl.numero}/${pl.ano}**

        **Ementa:** ${pl.ementa}

        ${pl.ementaDetalhada ? `**Detalhamento:** ${pl.ementaDetalhada}` : ''}

        **Situação:** ${pl.statusProposicao.descricaoSituacao}

        **Autores:** ${autores.slice(0, 3).map((a) => a.nome).join(', ')}

        Responda APENAS com um JSON válido (sem markdown, sem \`\`\`):
        {
          "impactScore": <número de 0 a 10>,
          "areas": ["área1", "área2"],
          "affectsCitizen": <true ou false>,
          "urgency": "<high, medium ou low>",
          "reasoning": "<explicação breve em português>",
          "localRelevance": <true ou false>
        }

        Áreas possíveis: saúde, educação, segurança, economia, trabalho, transporte, meio-ambiente, direitos, tecnologia, outros

        Critérios:
        - impactScore: Quanto afeta o dia-a-dia do brasileiro comum
        - affectsCitizen: true se impacta diretamente vida do cidadão
        - urgency: baseado na proximidade de votação e importância
        - localRelevance: true se tem impacto municipal/estadual
        `;

      const response = await openaiService.chat(
        prompt,
        'Você é um analista político que avalia a relevância de Projetos de Lei para cidadãos brasileiros.'
      );
      
      // Extrai JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      const impact: RelevanceImpact = JSON.parse(jsonMatch[0]);

      // Calcula score final (0-100)
      let score = impact.impactScore * 10;
      
      // Boosts
      if (isTrending) score += 20; // Está na mídia
      if (impact.urgency === 'high') score += 15; // Urgente
      if (impact.affectsCitizen) score += 10; // Afeta cidadão
      if (impact.localRelevance) score += 5; // Relevância local

      // Normaliza para 0-100
      score = Math.min(score, 100);

      return {
        score,
        shouldShow: score >= 50 && impact.affectsCitizen,
        impact,
      };

    } catch (error) {
      console.error('Erro ao calcular relevância:', error);
      
      // Fallback: relevância mínima
      return {
        score: 30,
        shouldShow: false,
        impact: {
          impactScore: 3,
          areas: ['outros'],
          affectsCitizen: false,
          urgency: 'low',
          reasoning: 'Erro na análise automática',
        },
      };
    }
  }

  /**
   * Gera resumo simplificado para cidadão
   */
  private async generateCitizenSummary(pl: ProposicaoDetalhada): Promise<string> {
    try {
      const text = pl.ementaDetalhada || pl.ementa;
      const plNumber = `PL ${pl.numero}/${pl.ano}`;
      
      return await openaiService.summarizePL(text, plNumber);
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      return pl.ementa;
    }
  }

  /**
   * Verifica se PL atende aos filtros
   */
  private matchesFilters(pl: CuratedPL, filters?: CurationFilters): boolean {
    if (!filters) return true;

    // Score mínimo
    if (filters.minRelevanceScore && pl.relevanceScore < filters.minRelevanceScore) {
      return false;
    }

    // Áreas específicas
    if (filters.areas && filters.areas.length > 0) {
      const hasMatchingArea = pl.impact.areas.some((area) =>
        filters.areas!.includes(area)
      );
      if (!hasMatchingArea) return false;
    }

    // Níveis de urgência
    if (filters.urgencyLevels && filters.urgencyLevels.length > 0) {
      if (!filters.urgencyLevels.includes(pl.impact.urgency)) {
        return false;
      }
    }

    // Apenas trending
    if (filters.onlyTrending && !pl.isTrending) {
      return false;
    }

    return true;
  }

  /**
   * Busca PLs curados por área de interesse
   */
  async getPLsByArea(area: string, limit: number = 5): Promise<CuratedPL[]> {
    return this.curatePLsForWeek({
      areas: [area],
      limit,
      minRelevanceScore: 60,
    });
  }

  /**
   * Busca PLs urgentes (alta prioridade)
   */
  async getUrgentPLs(limit: number = 5): Promise<CuratedPL[]> {
    return this.curatePLsForWeek({
      urgencyLevels: ['high'],
      limit,
      minRelevanceScore: 70,
    });
  }

  /**
   * Busca PLs em destaque na mídia
   */
  async getTrendingPLs(limit: number = 5): Promise<CuratedPL[]> {
    return this.curatePLsForWeek({
      onlyTrending: true,
      limit,
      minRelevanceScore: 60,
    });
  }

  /**
   * Busca detalhes de um PL específico já curado
   */
  async getCuratedPLById(id: number): Promise<CuratedPL | null> {
    try {
      const { dados: pls } = await camaraAPIService.fetchProposicoes({
        itens: 1,
      });

      const pl = pls.find((p) => p.id === id);
      if (!pl) return null;

      const trendingPLs = await plScraperService.scrapeTrendingPLs();
      return await this.processPL(pl, trendingPLs);

    } catch (error) {
      console.error(`Erro ao buscar PL ${id}:`, error);
      return null;
    }
  }
}

export default new PLCurationService();
export type { CuratedPL, RelevanceAnalysis, RelevanceImpact, CurationFilters };
