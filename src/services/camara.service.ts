import axios, { AxiosInstance } from 'axios';

interface Proposicao {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
}

interface ProposicaoDetalhada extends Proposicao {
  dataApresentacao: string;
  statusProposicao: {
    descricaoTramitacao: string;
    descricaoSituacao: string;
    despacho: string;
    url: string;
  };
  uriAutores: string;
  descricaoTipo: string;
  ementaDetalhada: string;
  keywords: string;
  uriPropPrincipal: string;
  urlInteiroTeor: string;
}

interface Autor {
  id: number;
  uri: string;
  nome: string;
  tipo: string;
  sigla?: string;
  uriPartido?: string;
  siglaPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
}

class CamaraAPIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://dadosabertos.camara.leg.br/api/v2',
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Lista proposições recentes
   */
  async listarProposicoesRecentes(
    limit = 10,
    tipo = 'PL', // PL = Projeto de Lei
  ): Promise<Proposicao[]> {
    try {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30); // Últimos 30 dias

      const response = await this.api.get('/proposicoes', {
        params: {
          siglaTipo: tipo,
          dataInicio: dataInicio.toISOString().split('T')[0],
          ordem: 'DESC',
          ordenarPor: 'id',
          itens: limit,
        },
      });

      return response.data.dados || [];
    } catch (error) {
      console.error('Erro ao listar proposições:', error);
      throw new Error('Erro ao buscar proposições na API da Câmara');
    }
  }

  /**
   * Obtém detalhes de uma proposição específica
   */
  async obterProposicao(id: number): Promise<ProposicaoDetalhada> {
    try {
      const response = await this.api.get(`/proposicoes/${id}`);
      return response.data.dados;
    } catch (error) {
      console.error('Erro ao obter proposição:', error);
      throw new Error('Erro ao buscar detalhes da proposição');
    }
  }

  /**
   * Obtém os autores de uma proposição
   */
  async obterAutores(id: number): Promise<Autor[]> {
    try {
      const response = await this.api.get(`/proposicoes/${id}/autores`);
      return response.data.dados || [];
    } catch (error) {
      console.error('Erro ao obter autores:', error);
      return [];
    }
  }

  /**
   * Formata uma proposição para exibição
   */
  formatarProposicao(proposicao: ProposicaoDetalhada, autores: Autor[]): string {
    const autoresNomes = autores.map((a) => a.nome).join(', ');
    const tipo = `${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano}`;

    return `📋 *${tipo}*

        *Ementa:*
        ${proposicao.ementa}

        ${proposicao.ementaDetalhada ? `*Detalhes:*\n${proposicao.ementaDetalhada}\n\n` : ''}*Autores:*
        ${autoresNomes || 'Não informado'}

        *Situação:*
        ${proposicao.statusProposicao?.descricaoSituacao || 'Não informado'}

        *Tramitação:*
        ${proposicao.statusProposicao?.descricaoTramitacao || 'Não informado'}

        *Data de apresentação:*
        ${new Date(proposicao.dataApresentacao).toLocaleDateString('pt-BR')}

        🔗 Texto completo: ${proposicao.urlInteiroTeor || 'Não disponível'}
        `;
  }

  /**
   * Busca uma proposição aleatória recente para demonstração
   */
  async buscarProposicaoAleatoria(): Promise<{
    proposicao: ProposicaoDetalhada;
    autores: Autor[];
    textoFormatado: string;
  }> {
    try {
      const proposicoes = await this.listarProposicoesRecentes(20);

      if (proposicoes.length === 0) {
        throw new Error('Nenhuma proposição encontrada');
      }

      // Seleciona uma aleatória
      const randomIndex = Math.floor(Math.random() * proposicoes.length);
      const proposicaoBasica = proposicoes[randomIndex];

      // Busca detalhes
      const proposicao = await this.obterProposicao(proposicaoBasica.id);
      const autores = await this.obterAutores(proposicaoBasica.id);
      const textoFormatado = this.formatarProposicao(proposicao, autores);

      return {
        proposicao,
        autores,
        textoFormatado,
      };
    } catch (error) {
      console.error('Erro ao buscar proposição aleatória:', error);
      throw new Error('Erro ao buscar proposição da Câmara');
    }
  }

  /**
   * Monta texto para a IA processar
   */
  montarTextoParaIA(proposicao: ProposicaoDetalhada): string {
        return `
    Tipo: ${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano}

    Ementa: ${proposicao.ementa}

    ${proposicao.ementaDetalhada ? `Detalhes: ${proposicao.ementaDetalhada}` : ''}

    Situação atual: ${proposicao.statusProposicao?.descricaoSituacao || 'Não informado'}

    Tramitação: ${proposicao.statusProposicao?.descricaoTramitacao || 'Não informado'}
    `.trim();
    }
    }

export default new CamaraAPIService();
