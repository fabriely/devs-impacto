/**
 * Serviço principal do WhatsApp usando Baileys diretamente
 * 
 * Este serviço substitui a Evolution API e nos dá controle total sobre:
 * - LID mapping (descriptografia de números)
 * - Gerenciamento de sessões
 * - Eventos de mensagens
 * 
 * Referências:
 * - https://baileys.wiki/docs/socket/connecting
 * - https://baileys.wiki/docs/migration/to-v7.0.0/#lids
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from 'baileys';
import type { WASocket, ConnectionState, WAMessage } from 'baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';

// Tipos
interface MessageHandler {
  (message: WAMessage): Promise<void>;
}

class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;

  private authPath = './auth_state';

  private isConnected = false;

  private messageHandlers: MessageHandler[] = [];

  private reconnectAttempts = 0;

  private maxReconnectAttempts = 5;

  /**
   * Inicializa o serviço do WhatsApp
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Iniciando serviço WhatsApp com Baileys...');

      // Busca a versão mais recente do WhatsApp Web
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Carrega o estado de autenticação
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      // Cria o socket do WhatsApp
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Vamos mostrar o QR customizado
        logger: pino({ level: 'warn' }), // Apenas warnings e erros
        browser: ['Devs Impacto Bot', 'Chrome', '10.0.0'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
      });

      // Registra eventos
      this.setupEventHandlers(saveCreds);

      console.log('✅ Serviço WhatsApp inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar serviço WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Configura os handlers de eventos do WhatsApp
   */
  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.sock) return;

    // 1. Evento de atualização de conexão (QR, conectou, desconectou)
    this.sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update);
    });

    // 2. Salvar credenciais quando mudarem
    this.sock.ev.on('creds.update', saveCreds);

    // 3. Evento para lidar com mapeamento de LID/PN
    this.sock.ev.on('lid-mapping.update', (update) => {
      this.emit('lid-mapping-update', update);
    });

    // 4. Evento de mensagens
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      await this.handleMessages(messages);
    });

    // 5. Evento de presença (online/offline)
    this.sock.ev.on('presence.update', (presence) => {
      console.log('👤 Presença:', presence);
    });

    // 6. Evento de contatos atualizados
    this.sock.ev.on('contacts.update', (contacts) => {
      console.log('📇 Contatos atualizados:', contacts.length);
    });
  }

  /**
   * Lida com atualizações de conexão
   */
  private async handleConnectionUpdate(update: Partial<ConnectionState>): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // Mostra QR Code
    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      this.emit('qr', qr);
    }

    // Conexão estabelecida
    if (connection === 'open') {
      console.log('✅ WhatsApp conectado com sucesso!');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

    }

    // Conexão fechada
    if (connection === 'close') {
      this.isConnected = false;
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log('❌ Conexão fechada. Motivo:', lastDisconnect?.error);

      if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        setTimeout(() => this.start(), 3000);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Número máximo de tentativas de reconexão atingido');
        this.emit('max-reconnect-attempts');
      } else {
        console.log('🚪 Desconectado (logout)');
        this.emit('disconnected');
      }
    }

    // Conectando
    if (connection === 'connecting') {
      console.log('🔄 Conectando ao WhatsApp...');
      this.emit('connecting');
    }
  }

  /**
   * Processa mensagens recebidas
   */
  private async handleMessages(messages: WAMessage[]): Promise<void> {
    // Filtra mensagens válidas (não enviadas por nós e com conteúdo)
    const validMessages = messages.filter(msg => !msg.key.fromMe && msg.message);

    // Processa cada mensagem
    await Promise.all(
      validMessages.map(async (msg) => {
        // Log de LID mapping se aplicável
        if (msg.key.remoteJid?.endsWith('@lid')) {          
          // Tenta obter o PN real do mapeamento
          await this.getPNForLID(msg.key.remoteJid);
        }

        // Chama handlers registrados
        await Promise.all(
          this.messageHandlers.map(async (handler) => {
            try {
              await handler(msg);
            } catch (error) {
              console.error('❌ Erro no handler de mensagem:', error);
            }
          })
        );
      })
    );
  }

  /**
   * Registra um handler para processar mensagens
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Envia mensagem de texto
   */
  async sendText(to: string, text: string): Promise<void> {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      // Normaliza o JID
      const jid = jidNormalizedUser(to);
      
      await this.sock.sendMessage(jid, { text });
      console.log(`✅ Mensagem enviada para ${to}`);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Envia áudio
   */
  async sendAudio(to: string, audioBuffer: Buffer): Promise<void> {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const jid = jidNormalizedUser(to);
      
      await this.sock.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: 'audio/mp4',
        ptt: true, // Push to talk (mensagem de voz)
      });
      
      console.log(`✅ Áudio enviado para ${to}`);
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error);
      throw error;
    }
  }

  /**
   * Obtém o PN (Phone Number) a partir de um LID
   */
  async getPNForLID(lid: string): Promise<string | null> {
    if (!this.sock) return null;

    try {
      const pn = await this.sock.signalRepository.lidMapping.getPNForLID(lid);
      return pn;
    } catch (error) {
      console.warn('⚠️ Não foi possível obter PN para LID:', lid);
      return null;
    }
  }

  /**
   * Obtém o LID a partir de um PN (Phone Number)
   */
  async getLIDForPN(pn: string): Promise<string | null> {
    if (!this.sock) return null;

    try {
      const lid = await this.sock.signalRepository.lidMapping.getLIDForPN(pn);
      return lid;
    } catch (error) {
      console.warn('⚠️ Não foi possível obter LID para PN:', pn);
      return null;
    }
  }

  /**
   * Verifica se está conectado
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Obtém o socket (para uso avançado)
   */
  getSocket(): WASocket | null {
    return this.sock;
  }

  /**
   * Desconecta do WhatsApp
   */
  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isConnected = false;
      console.log('🚪 Desconectado do WhatsApp');
    }
  }
}

// Exporta instância singleton
export default new WhatsAppService();
