/**
 * Serviço de integração com Twitter/X
 * 
 * Publica tweets automaticamente quando:
 * - Um novo PL relevante é adicionado ao sistema
 * - Um PL atinge alta lacuna legislativa
 * - Métricas importantes são atualizadas
 * 
 * Usa a API v2 do Twitter (X API)
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface TweetData {
  text: string;
}

interface TweetResponse {
  data: {
    id: string;
    text: string;
    edit_history_tweet_ids: string[];
  };
}

interface PLTweetData {
  numero: string;
  titulo: string;
  resumo: string;
  tema: string;
  autores: string[];
  urlCamara: string;
  relevanceScore?: number;
  impactScore?: number;
}

class TwitterService {
  private client: AxiosInstance;

  private apiKey: string;

  private apiSecret: string;

  private accessToken: string;

  private accessTokenSecret: string;

  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY || '';
    this.apiSecret = process.env.TWITTER_API_SECRET || '';
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';

    // Verifica se as credenciais estão configuradas
    this.enabled = !!(
      this.apiKey &&
      this.apiSecret &&
      this.accessToken &&
      this.accessTokenSecret
    );

    if (!this.enabled) {
      console.warn('⚠️ Twitter não configurado. Configure as variáveis de ambiente para habilitar.');
    }

    // Cliente HTTP para API do Twitter
    this.client = axios.create({
      baseURL: 'https://api.twitter.com/2',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Gera cabeçalho OAuth 1.0a para autenticação
   */
  private generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.apiKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(32).toString('hex'),
      oauth_version: '1.0',
    };

    // Combina parâmetros OAuth e parâmetros da requisição
    const allParams = { ...oauthParams, ...params };

    // Ordena parâmetros
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key] || '')}`)
      .join('&');

    // Base string para assinatura
    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString),
    ].join('&');

    // Chave de assinatura
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // Gera assinatura HMAC-SHA1
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    // Adiciona assinatura aos parâmetros OAuth
    oauthParams.oauth_signature = signature;

    // Monta cabeçalho OAuth
    const oauthHeader = Object.keys(oauthParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key] || '')}"`)
      .join(', ');

    return `OAuth ${oauthHeader}`;
  }

  /**
   * Publica um tweet
   */
  private async postTweet(text: string): Promise<TweetResponse | null> {
    if (!this.enabled) {
      console.log('ℹ️ Twitter desabilitado. Tweet que seria postado:', text);
      return null;
    }

    try {
      const url = 'https://api.twitter.com/2/tweets';
      const data: TweetData = { text };

      const oauthHeader = this.generateOAuthHeader('POST', url);

      const response = await this.client.post<TweetResponse>('/tweets', data, {
        headers: {
          Authorization: oauthHeader,
        },
      });

      console.log('✅ Tweet publicado com sucesso:', response.data.data.id);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Erro ao publicar tweet:', error.response?.data || error.message);
      } else {
        console.error('❌ Erro ao publicar tweet:', error);
      }
      return null;
    }
  }

  /**
   * Formata e publica tweet sobre novo PL
   */
  async tweetNewPL(plData: PLTweetData): Promise<TweetResponse | null> {
    try {
      // Formata o texto do tweet (limite de 280 caracteres)
      const emoji = this.getEmojiForTheme(plData.tema);
      const autoresText = plData.autores.slice(0, 2).join(', ');
      
      let tweetText = `${emoji} Novo PL em Análise!\n\n`;
      tweetText += `${plData.numero}: ${plData.titulo}\n\n`;
      
      // Adiciona resumo se couber
      const remainingChars = 280 - tweetText.length - plData.urlCamara.length - 20;
      if (plData.resumo && remainingChars > 50) {
        const resumo = `${plData.resumo.substring(0, remainingChars)}...`;
        tweetText += `${resumo}\n\n`;
      }
      
      tweetText += `👤 ${autoresText}\n`;
      tweetText += `#VozLocal #Legislativo #${plData.tema.replace(/\s/g, '')}`;

      // Publica tweet
      console.log('📤 Publicando tweet sobre PL:', plData.numero);
      return await this.postTweet(tweetText);
    } catch (error) {
      console.error('❌ Erro ao criar tweet de PL:', error);
      return null;
    }
  }

  /**
   * Publica tweet sobre lacuna legislativa alta
   */
  async tweetHighLacuna(tema: string, percentual: number, demandas: number, pls: number): Promise<TweetResponse | null> {
    try {
      const emoji = this.getEmojiForTheme(tema);
      
      const tweetText = `${emoji} Alerta de Lacuna Legislativa!\n\n` +
        `Tema: ${tema}\n` +
        `Lacuna: ${percentual.toFixed(1)}%\n\n` +
        `📊 ${demandas} demandas cidadãs\n` +
        `📜 ${pls} PLs em tramitação\n\n` +
        `Os cidadãos pedem mais atenção do legislativo neste tema!\n\n` +
        `#VozLocal #LacunaLegislativa #${tema.replace(/\s/g, '')}`;

      console.log('📤 Publicando tweet sobre lacuna:', tema);
      return await this.postTweet(tweetText);
    } catch (error) {
      console.error('❌ Erro ao criar tweet de lacuna:', error);
      return null;
    }
  }

  /**
   * Publica resumo semanal
   */
  async tweetWeeklySummary(stats: {
    totalProposals: number;
    totalPLs: number;
    topTheme: string;
    topLacuna: number;
    totalCitizens: number;
  }): Promise<TweetResponse | null> {
    try {
      const tweetText = `📊 Resumo Semanal - Voz.Local\n\n` +
        `👥 ${stats.totalCitizens} cidadãos engajados\n` +
        `💬 ${stats.totalProposals} propostas recebidas\n` +
        `📜 ${stats.totalPLs} PLs monitorados\n\n` +
        `🔥 Tema mais demandado: ${stats.topTheme}\n` +
        `⚠️ Maior lacuna: ${stats.topLacuna.toFixed(1)}%\n\n` +
        `Conectando cidadãos ao legislativo!\n\n` +
        `#VozLocal #Democracia #ParticipaçãoCidadã`;

      console.log('📤 Publicando resumo semanal');
      return await this.postTweet(tweetText);
    } catch (error) {
      console.error('❌ Erro ao criar tweet de resumo:', error);
      return null;
    }
  }

  /**
   * Publica tweet sobre PL aprovado
   */
  async tweetPLApproved(plData: PLTweetData): Promise<TweetResponse | null> {
    try {
      const emoji = '✅';
      
      const tweetText = `${emoji} PL Aprovado!\n\n` +
        `${plData.numero}: ${plData.titulo}\n\n` +
        `Este projeto de lei foi aprovado e agora segue para sanção!\n\n` +
        `📊 Era uma das pautas mais demandadas pelos cidadãos.\n\n` +
        `#VozLocal #PLAprovado #${plData.tema.replace(/\s/g, '')}`;

      console.log('📤 Publicando tweet sobre PL aprovado:', plData.numero);
      return await this.postTweet(tweetText);
    } catch (error) {
      console.error('❌ Erro ao criar tweet de PL aprovado:', error);
      return null;
    }
  }

  /**
   * Retorna emoji adequado para cada tema
   */
  private getEmojiForTheme(tema: string): string {
    const emojiMap: Record<string, string> = {
      'Saúde': '🏥',
      'Educação': '📚',
      'Segurança Pública': '🚨',
      'Transporte e Mobilidade': '🚌',
      'Infraestrutura Urbana': '🏗️',
      'Meio Ambiente': '🌳',
      'Cultura e Lazer': '🎭',
      'Assistência Social': '🤝',
      'Habitação': '🏠',
      'Economia e Trabalho': '💼',
    };

    if (tema in emojiMap) {
      return emojiMap[tema];
    }
    return '📋';
  }

  /**
   * Verifica se o serviço está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Testa a conexão com o Twitter
   */
  async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      console.log('❌ Twitter não configurado');
      return false;
    }

    try {
      // Tenta fazer uma requisição simples para verificar autenticação
      const url = 'https://api.twitter.com/2/users/me';
      const oauthHeader = this.generateOAuthHeader('GET', url);

      await this.client.get('/users/me', {
        headers: {
          Authorization: oauthHeader,
        },
      });

      console.log('✅ Conexão com Twitter OK');
      return true;
    } catch (error) {
      console.error('❌ Falha na conexão com Twitter:', error);
      return false;
    }
  }
}

// Exporta instância singleton
const twitterService = new TwitterService();
export default twitterService;
