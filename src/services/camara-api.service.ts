/**
 * Cliente da API Dados Abertos da Câmara dos Deputados
 * Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
 */

import axios, { AxiosInstance } from 'axios';

interface CamaraAPIConfig {
  baseURL: string;
  timeout: number;
}

interface PLFilters {
  dataInicio?: string;
  dataFim?: string;
  siglaTipo?: string; // 'PL', 'PEC', 'PLP'
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: 'id' | 'dataApresentacao';
  itens?: number;
}

interface ProposicaoBasica {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
}

interface ProposicaoDetalhada extends ProposicaoBasica {
  dataApresentacao: string;
  uriAutores: string;
  statusProposicao: {
    dataHora: string;
    sequencia: number;
    siglaOrgao: string;
    uriOrgao: string;
    uriUltimoRelator: string;
    regime: string;
    descricaoTramitacao: string;
    codTipoTramitacao: string;
    descricaoSituacao: string;
    codSituacao: number;
    despacho: string;
    url: string;
  };
  uriPropPrincipal?: string;
  uriPropAnterior?: string;
  uriPropPosterior?: string;
  urlInteiroTeor?: string;
  ementaDetalhada?: string;
  keywords?: string;
  uriOrgaoNumerador?: string;
}

interface Autor {
  id: number;
  uri: string;
  nome: string;
  codTipo: number;
  tipo: string;
  ordemAssinatura: number;
  proponente: number;
}

interface Tramitacao {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  uriOrgao: string;
  uriUltimoRelator?: string;
  regime: string;
  descricaoTramitacao: string;
  codTipoTramitacao: string;
  descricaoSituacao: string;
  codSituacao: number;
  despacho: string;
  url: string;
}

interface Votacao {
  id: string;
  uri: string;
  data: string;
  dataHoraRegistro: string;
  siglaOrgao: string;
  uriOrgao: string;
  uriEvento: string;
  proposicaoObjeto: string;
  uriProposicaoObjeto: string;
  descricao: string;
  aprovacao: number;
}

class CamaraAPIService {
  private client: AxiosInstance;

  private readonly baseURL = 'https://dadosabertos.camara.leg.br/api/v2';

  constructor(config?: Partial<CamaraAPIConfig>) {
    this.client = axios.create({
      baseURL: config?.baseURL || this.baseURL,
      timeout: config?.timeout || 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DevsImpacto/1.0',
      },
    });

    // Interceptor para logs
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Câmara: ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`❌ API Câmara Error: ${error.config?.url} - ${error.message}`);
        throw error;
      }
    );
  }

  /**
   * Busca proposições (PLs) com filtros
   */
  async fetchProposicoes(filters?: PLFilters): Promise<{ dados: ProposicaoBasica[] }> {
    try {
      const params = new URLSearchParams();

      if (filters?.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.append('dataFim', filters.dataFim);
      if (filters?.siglaTipo) params.append('siglaTipo', filters.siglaTipo);
      if (filters?.ordem) params.append('ordem', filters.ordem);
      if (filters?.ordenarPor) params.append('ordenarPor', filters.ordenarPor);
      if (filters?.itens) params.append('itens', filters.itens.toString());

      const response = await this.client.get(`/proposicoes?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar proposições:', error);
      throw error;
    }
  }

  /**
   * Busca PLs recentes da última semana
   */
  async fetchRecentPLs(limit: number = 100): Promise<{ dados: ProposicaoBasica[] }> {
    const filters: PLFilters = {
      dataInicio: this.getLastWeek(),
      dataFim: this.getToday(),
      siglaTipo: 'PL',
      ordem: 'DESC',
      itens: limit,
    };

    return this.fetchProposicoes(filters);
  }

  /**
   * Busca detalhes completos de uma proposição
   */
  async fetchProposicaoDetalhes(id: number): Promise<ProposicaoDetalhada> {
    try {
      const response = await this.client.get(`/proposicoes/${id}`);
      return response.data.dados;
    } catch (error) {
      console.error(`Erro ao buscar detalhes do PL ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca autores de uma proposição
   */
  async fetchProposicaoAutores(id: number): Promise<Autor[]> {
    try {
      const response = await this.client.get(`/proposicoes/${id}/autores`);
      return response.data.dados;
    } catch (error) {
      console.error(`Erro ao buscar autores do PL ${id}:`, error);
      return [];
    }
  }

  /**
   * Busca tramitações de uma proposição
   */
  async fetchProposicaoTramitacoes(id: number): Promise<Tramitacao[]> {
    try {
      const response = await this.client.get(`/proposicoes/${id}/tramitacoes`);
      return response.data.dados;
    } catch (error) {
      console.error(`Erro ao buscar tramitações do PL ${id}:`, error);
      return [];
    }
  }

  /**
   * Busca votações de uma proposição
   */
  async fetchProposicaoVotacoes(id: number): Promise<Votacao[]> {
    try {
      const response = await this.client.get(`/proposicoes/${id}/votacoes`);
      return response.data.dados || [];
    } catch (error) {
      console.error(`Erro ao buscar votações do PL ${id}:`, error);
      return [];
    }
  }

  /**
   * Busca proposição completa com todos os dados
   */
  async fetchProposicaoCompleta(id: number): Promise<{
    detalhes: ProposicaoDetalhada;
    autores: Autor[];
    tramitacoes: Tramitacao[];
    votacoes: Votacao[];
  }> {
    try {
      const [detalhes, autores, tramitacoes, votacoes] = await Promise.all([
        this.fetchProposicaoDetalhes(id),
        this.fetchProposicaoAutores(id),
        this.fetchProposicaoTramitacoes(id),
        this.fetchProposicaoVotacoes(id),
      ]);

      return {
        detalhes,
        autores,
        tramitacoes,
        votacoes,
      };
    } catch (error) {
      console.error(`Erro ao buscar proposição completa ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca texto integral da proposição
   */
  async fetchProposicaoTexto(id: number): Promise<string | null> {
    try {
      const detalhes = await this.fetchProposicaoDetalhes(id);
      
      if (!detalhes.urlInteiroTeor) {
        return null;
      }

      // Busca o PDF/HTML do texto integral
      const response = await axios.get(detalhes.urlInteiroTeor, {
        timeout: 15000,
        responseType: 'text',
      });

      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar texto integral do PL ${id}:`, error);
      return null;
    }
  }

  /**
   * Retorna data de uma semana atrás (formato: YYYY-MM-DD)
   */
  private getLastWeek(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return this.formatDate(date);
  }

  /**
   * Retorna data de hoje (formato: YYYY-MM-DD)
   */
  private getToday(): string {
    return this.formatDate(new Date());
  }

  /**
   * Formata data para o padrão da API
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export default new CamaraAPIService();
export type { 
  ProposicaoBasica, 
  ProposicaoDetalhada, 
  Autor, 
  Tramitacao, 
  Votacao,
  PLFilters 
};
