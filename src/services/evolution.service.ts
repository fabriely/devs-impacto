import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import env from '../env';

interface SendTextMessageParams {
  number: string;
  text: string;
}

interface SendAudioMessageParams {
  number: string;
  audioBuffer: Buffer;
  filename?: string;
}

interface WebhookMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    audioMessage?: {
      url: string;
      mimetype: string;
      seconds: number;
    };
  };
  messageType: string;
  pushName: string;
}

class EvolutionAPIService {
  private api: AxiosInstance;

  private instanceName: string;

  constructor() {
    this.instanceName = env.EVOLUTION_INSTANCE_NAME;
    
    this.api = axios.create({
      baseURL: env.EVOLUTION_API_URL,
      headers: {
        'apikey': env.EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Envia mensagem de texto para um número
   */
  async sendTextMessage({ number, text }: SendTextMessageParams): Promise<void> {
    try {
      await this.api.post(`/message/sendText/${this.instanceName}`, {
        number: this.formatNumber(number),
        text,
        delay: 1000,
      });
      
      console.log(`Mensagem enviada para ${number}`);
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      throw new Error('Erro ao enviar mensagem via WhatsApp');
    }
  }

  /**
   * Envia áudio para um número
   */
  async sendAudioMessage({ number, audioBuffer, filename = 'audio.mp3' }: SendAudioMessageParams): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('number', this.formatNumber(number));
      formData.append('audio', audioBuffer, {
        filename,
        contentType: 'audio/mpeg',
      });
      formData.append('delay', '1000');

      await this.api.post(`/message/sendWhatsAppAudio/${this.instanceName}`, formData, {
        headers: {
          ...formData.getHeaders(),
          'apikey': env.EVOLUTION_API_KEY,
        },
      });

      console.log(`Áudio enviado para ${number}`);
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      throw new Error('Erro ao enviar áudio via WhatsApp');
    }
  }

  /**
   * Baixa o áudio de uma mensagem
   */
  async downloadAudio(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Erro ao baixar áudio:', error);
      throw new Error('Erro ao baixar áudio');
    }
  }

  /**
   * Extrai informações de uma mensagem do webhook
   */
  parseWebhookMessage(data: any): WebhookMessage | null {
    try {
      const messageData = data.data;
      
      if (!messageData || messageData.key.fromMe) {
        return null; // Ignora mensagens enviadas pelo bot
      }

      return messageData as WebhookMessage;
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return null;
    }
  }

  /**
   * Extrai o texto de uma mensagem
   */
  extractText(message: WebhookMessage): string | null {
    if (message.message?.conversation) {
      return message.message.conversation;
    }
    
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }

    return null;
  }

  /**
   * Extrai URL do áudio de uma mensagem
   */
  extractAudioUrl(message: WebhookMessage): string | null {
    if (message.message?.audioMessage?.url) {
      return message.message.audioMessage.url;
    }

    return null;
  }

  /**
   * Formata número para padrão internacional
   */
  private formatNumber(number: string): string {
    // Remove caracteres não numéricos
    let cleaned = number.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona +55 (Brasil)
    if (!cleaned.startsWith('55')) {
      cleaned = `55${cleaned}`;
    }
    
    // Adiciona @s.whatsapp.net se não tiver
    if (!cleaned.includes('@')) {
      cleaned += '@s.whatsapp.net';
    }

    return cleaned;
  }

  /**
   * Extrai número limpo do formato do WhatsApp
   */
  extractPhoneNumber(remoteJid: string): string {
    return remoteJid.replace('@s.whatsapp.net', '');
  }
}

export default new EvolutionAPIService();
