/**
 * Controller do WhatsApp Bot usando Baileys diretamente
 * 
 * Este controller substitui o WhatsAppBotController que usava Evolution API
 * Agora temos controle total sobre LID mapping e processamento de mensagens
 */

import { Request, Response } from 'express';
import type { WAMessage } from 'baileys';
import whatsappService from '../services/whatsapp.service';
import openaiService from '../services/openai.service';
import plCurationService from '../services/pl-curation.service';

interface WhatsAppSession {
  step: 'idle' | 'waiting_question' | 'waiting_opinion' | 'waiting_area_selection' | 'waiting_curation_audio_choice';
  plSummary?: string;
  plNumber?: string;
  selectedArea?: string;
  curationPLs?: Array<{ numero: string; ano: string; ementa: string; citizenSummary: string }>;
}

// Armazena o estado da conversa de cada usuário
const userSessions = new Map<string, WhatsAppSession>();

class BaileysWhatsAppController {
  constructor() {
    // Registra o handler de mensagens quando o serviço iniciar
    whatsappService.on('connected', () => {
      console.log('✅ WhatsApp conectado! Registrando handler de mensagens...');
      whatsappService.onMessage((msg) => this.handleIncomingMessage(msg));
    });
  }

  /**
   * Processa mensagem recebida do WhatsApp
   */
  private async handleIncomingMessage(msg: WAMessage): Promise<void> {
    try {
      const { remoteJid } = msg.key;
      if (!remoteJid) return;

      // Ignora mensagens de grupos
      if (remoteJid.endsWith('@g.us')) {
        console.log('🚫 Mensagem de grupo ignorada:', remoteJid);
        return;
      }

      // Extrai o número de telefone (pode ser LID ou PN)
      let phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      
      // Se é um LID, tenta obter o PN real
      if (remoteJid.endsWith('@lid')) {
        const pn = await whatsappService.getPNForLID(remoteJid);
        if (pn) {
          phoneNumber = pn.replace('@s.whatsapp.net', '');
          console.log(`🔐 LID convertido: ${remoteJid} -> ${pn}`);
        } else {
          console.warn('⚠️ Não foi possível converter LID para PN. Ignorando mensagem.');
          return;
        }
      }

      const userName = msg.pushName || 'Cidadão';

      // Processa texto
      const textMessage = this.extractText(msg);
      if (textMessage) {
        await this.handleTextMessage(phoneNumber, textMessage, userName, remoteJid);
        return;
      }

      // Processa áudio
      const hasAudio = this.hasAudio(msg);
      if (hasAudio) {
        await this.handleAudioMessage(phoneNumber, msg, userName, remoteJid);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }

  /**
   * Extrai texto de uma mensagem
   */
  private extractText(msg: WAMessage): string | null {
    if (msg.message?.conversation) {
      return msg.message.conversation;
    }
    
    if (msg.message?.extendedTextMessage?.text) {
      return msg.message.extendedTextMessage.text;
    }

    return null;
  }

  /**
   * Verifica se a mensagem contém áudio
   */
  private hasAudio(msg: WAMessage): boolean {
    return !!(msg.message?.audioMessage);
  }

  /**
   * Processa mensagem de texto
   */
  private async handleTextMessage(
    phoneNumber: string,
    text: string,
    userName: string,
    jid: string,
  ): Promise<void> {
    const session = this.getSession(phoneNumber);
    const textLower = text.toLowerCase().trim();

    // Comandos especiais
    if (textLower === 'menu' || textLower === 'inicio' || textLower === 'oi' || textLower === 'olá') {
      await this.sendWelcomeMessage(jid, userName);
      const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
      userSessions.set(phoneNumber, updatedSession);
      return;
    }
    console.log(`📩 Mensagem de ${phoneNumber}: ${text}`);
    console.log(`🧠 Estado da sessão: ${session.step}`);

    // Fluxo baseado no estado da sessão
    switch (session.step) {
      case 'idle':
        // Trata opções do menu
        if (textLower === '1') {
          await this.sendPLSummary(jid);
        } else if (textLower === '2') {
          await whatsappService.sendText(jid, 'Para fazer perguntas, primeiro veja um PL selecionando a opção 1️⃣');
          await this.sendWelcomeMessage(jid, userName);
        } else if (textLower === '3') {
          await whatsappService.sendText(jid, 'Para registrar opinião, primeiro veja um PL selecionando a opção 1️⃣');
          await this.sendWelcomeMessage(jid, userName);
        } else if (textLower === '4') {
          await this.showAreaSelectionMenu(jid, phoneNumber);
        } else if (textLower === '5') {
          await whatsappService.sendText(jid, 'Dashboard público em breve! 🏗️');
          await this.sendWelcomeMessage(jid, userName);
        } else {
          // Comando não reconhecido, mostra menu novamente
          await this.sendWelcomeMessage(jid, userName);
        }
        break;

      case 'waiting_question':
        await this.handleQuestion(jid, text, session);
        break;

      case 'waiting_opinion':
        await this.handleOpinion(jid, text, session, phoneNumber);
        break;

      case 'waiting_area_selection':
        await this.handleAreaSelection(jid, text, session, phoneNumber);
        break;

      case 'waiting_curation_audio_choice':
        await this.handleCurationAudioChoice(jid, text, session, phoneNumber);
        break;

      default:
        await this.sendWelcomeMessage(jid, userName);
    }
  }

  /**
   * Processa mensagem de áudio
   */
  private async handleAudioMessage(
    phoneNumber: string,
    msg: WAMessage,
    userName: string,
    jid: string,
  ): Promise<void> {
    try {
      await whatsappService.sendText(jid, '🎧 Recebendo seu áudio... Um momento!');

      // Baixa o áudio usando downloadMediaMessage do Baileys
      const audioBuffer = await whatsappService.downloadMedia(msg);
      
      console.log(`✅ Áudio baixado: ${audioBuffer.length} bytes`);

      // Transcreve com Whisper (WhatsApp envia áudio em formato opus/ogg)
      const transcription = await openaiService.transcribeAudio(audioBuffer, 'audio.ogg');

      await whatsappService.sendText(jid, `📝 Você disse: "${transcription}"`);

      // Processa o texto transcrito
      await this.handleTextMessage(phoneNumber, transcription, userName, jid);
    } catch (error) {
      console.error('❌ Erro ao processar áudio:', error);
      await whatsappService.sendText(
        jid,
        '❌ Desculpe, não consegui processar seu áudio. Tente novamente ou envie uma mensagem de texto.',
      );
    }
  }

  /**
   * Envia mensagem de boas-vindas
   */
  private async sendWelcomeMessage(jid: string, userName: string): Promise<void> {
    const message = `Olá, ${userName}! 👋

Sou o assistente da plataforma Devs Impacto! 🏛️

Estou aqui para te ajudar a entender Projetos de Lei de forma simples e participar da democracia.

📋 *Menu de opções:*

1️⃣ Ver novo PL
2️⃣ Fazer pergunta sobre PL 
3️⃣ Registrar opinião
4️⃣ Gerar curadoria de PLs
5️⃣ Ver dashboard público

Digite o número da opção ou envie uma mensagem de *áudio* que eu entendo! 🎙️`;

    await whatsappService.sendText(jid, message);
  }

  /**
   * Envia resumo de um PL
   */
  async sendPLSummary(jid: string, plId?: string): Promise<void> {
    try {
      await whatsappService.sendText(jid, '📄 Buscando novo Projeto de Lei...');

      // TODO: Buscar PL real da API da Câmara usando o plId
      const plNumber = plId ? `PL ${plId}` : 'PL 1234/2025';
      const plText = `Projeto de Lei que estabelece normas para proteção de dados pessoais 
      no ambiente digital, garantindo direitos fundamentais de liberdade e privacidade.`;

      const summary = await openaiService.summarizePL(plText, plNumber);

      // Extrai phoneNumber do JID para sessão (usando a mesma lógica de handleIncomingMessage)
      let phoneNumber = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
      
      // Se é um LID, tenta obter o PN real
      if (jid.endsWith('@lid')) {
        const pn = await whatsappService.getPNForLID(jid);
        if (pn) {
          phoneNumber = pn.replace('@s.whatsapp.net', '');
          console.log(`🔐 LID convertido: ${jid} -> ${pn}`);
        } else {
          console.warn('⚠️ Não foi possível converter LID para PN. Usando LID como chave.');
        }
      }
      const session = this.getSession(phoneNumber);
      session.plNumber = plNumber;
      session.plSummary = summary;
      session.step = 'waiting_question';

      // Envia resumo
      await whatsappService.sendText(jid, `📋 *${plNumber}*\n\n${summary}`);

      // Pergunta se quer áudio
      await whatsappService.sendText(
        jid,
        `🎙️ Quer ouvir este resumo em áudio?\n\n1️⃣ Sim\n2️⃣ Não\n\nOu faça uma pergunta sobre o PL!`,
      );
    } catch (error) {
      console.error('❌ Erro ao enviar resumo:', error);
      await whatsappService.sendText(jid, '❌ Erro ao buscar PL. Tente novamente mais tarde.');
    }
  }

  /**
   * Processa pergunta sobre o PL
   */
  private async handleQuestion(
    jid: string,
    question: string,
    session: WhatsAppSession,
  ): Promise<void> {
    try {
      const questionLower = question.toLowerCase().trim();

      // Se usuário quer áudio
      if (questionLower === '1' && session.plSummary) {
        await whatsappService.sendText(jid, '🔊 Gerando áudio...');

        const audioBuffer = await openaiService.generateAudio(session.plSummary);
        await whatsappService.sendAudio(jid, audioBuffer);

        await whatsappService.sendText(jid, 'Tem alguma dúvida sobre este PL? Pode perguntar!');
        return;
      }

      // Se não quer áudio
      if (questionLower === '2') {
        await whatsappService.sendText(jid, 'Tem alguma dúvida sobre este PL? Pode perguntar!');
        return;
      }

      // Responde a pergunta
      if (!session.plSummary) {
        await whatsappService.sendText(
          jid,
          'Por favor, primeiro veja um PL para fazer perguntas sobre ele.',
        );
        return;
      }

      await whatsappService.sendText(jid, '🤔 Pensando na resposta...');

      const answer = await openaiService.answerQuestion(session.plSummary, question);

      await whatsappService.sendText(jid, `💡 ${answer}`);

      // Pergunta sobre opinião
      await this.askForOpinion(jid, session);
    } catch (error) {
      console.error('❌ Erro ao responder pergunta:', error);
      await whatsappService.sendText(jid, '❌ Erro ao processar sua pergunta. Tente novamente.');
    }
  }

  /**
   * Pergunta a opinião do cidadão
   */
  private async askForOpinion(jid: string, session: WhatsAppSession): Promise<void> {
    // Extrai phoneNumber consistentemente
    let phoneNumber = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
    
    // Se é um LID, tenta obter o PN real
    if (jid.endsWith('@lid')) {
      const pn = await whatsappService.getPNForLID(jid);
      if (pn) {
        phoneNumber = pn.replace('@s.whatsapp.net', '');
      }
    }

    const updatedSession: WhatsAppSession = { ...session, step: 'waiting_opinion' };
    userSessions.set(phoneNumber, updatedSession);

    await whatsappService.sendText(
      jid,
      `🗳️ *Quer registrar sua opinião sobre este PL?*\n\n👍 A favor\n👎 Contra\n⏭️ Pular`,
    );
  }

  /**
   * Registra opinião do cidadão
   */
  private async handleOpinion(
    jid: string,
    opinion: string,
    session: WhatsAppSession,
    phoneNumber: string,
  ): Promise<void> {
    const opinionLower = opinion.toLowerCase().trim();

    if (opinionLower.includes('favor') || opinionLower === '👍' || opinionLower === '1') {
      await whatsappService.sendText(
        jid,
        '✅ Opinião registrada: A FAVOR\n\nSua participação é muito importante! 🙌',
      );
    } else if (opinionLower.includes('contra') || opinionLower === '👎' || opinionLower === '2') {
      await whatsappService.sendText(
        jid,
        '✅ Opinião registrada: CONTRA\n\nSua participação é muito importante! 🙌',
      );
    } else {
      await whatsappService.sendText(jid, '⏭️ Ok, vamos para o próximo!');
    }

    const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
    userSessions.set(phoneNumber, updatedSession);
    await this.sendWelcomeMessage(jid, 'Cidadão');
  }

  /**
   * Mostra menu de seleção de área de interesse
   */
  private async showAreaSelectionMenu(jid: string, phoneNumber: string): Promise<void> {
    const message = `🎯 *Curadoria de Projetos de Lei*

Vou buscar os PLs mais relevantes para você!

📚 *Escolha uma área de interesse:*

1️⃣ Saúde
2️⃣ Educação
3️⃣ Segurança
4️⃣ Economia
5️⃣ Trabalho
6️⃣ Transporte
7️⃣ Meio Ambiente
8️⃣ Direitos
9️⃣ Tecnologia
🔟 Todos (geral)

Digite o número da área que você quer acompanhar:`;

    await whatsappService.sendText(jid, message);

    // Atualiza estado da sessão
    const session = this.getSession(phoneNumber);
    const updatedSession: WhatsAppSession = { ...session, step: 'waiting_area_selection' };
    userSessions.set(phoneNumber, updatedSession);
  }

  /**
   * Processa seleção de área e gera curadoria
   */
  private async handleAreaSelection(
    jid: string,
    text: string,
    session: WhatsAppSession,
    phoneNumber: string,
  ): Promise<void> {
    const textLower = text.toLowerCase().trim();

    // Mapeia opções para áreas
    let selectedArea: string | undefined;
    
    switch (textLower) {
      case '1':
        selectedArea = 'saúde';
        break;
      case '2':
        selectedArea = 'educação';
        break;
      case '3':
        selectedArea = 'segurança';
        break;
      case '4':
        selectedArea = 'economia';
        break;
      case '5':
        selectedArea = 'trabalho';
        break;
      case '6':
        selectedArea = 'transporte';
        break;
      case '7':
        selectedArea = 'meio-ambiente';
        break;
      case '8':
        selectedArea = 'direitos';
        break;
      case '9':
        selectedArea = 'tecnologia';
        break;
      case '10':
        selectedArea = 'todos';
        break;
      default:
        selectedArea = undefined;
    }

    if (!selectedArea) {
      await whatsappService.sendText(
        jid,
        '❌ Opção inválida. Por favor, escolha um número de 1 a 10.',
      );
      await this.showAreaSelectionMenu(jid, phoneNumber);
      return;
    }

    // Mostra mensagem de carregamento
    await whatsappService.sendText(
      jid,
      `🔍 Buscando PLs relevantes na área de *${selectedArea}*...\n\nIsso pode levar alguns segundos. Aguarde! ⏳`,
    );

    try {
      // Busca PLs curados por área
      const curatedPLs = selectedArea === 'todos'
        ? await plCurationService.curatePLsForWeek({ limit: 5, minRelevanceScore: 60 })
        : await plCurationService.getPLsByArea(selectedArea, 5);

      if (curatedPLs.length === 0) {
        await whatsappService.sendText(
          jid,
          `😔 Não encontrei PLs relevantes na área de *${selectedArea}* no momento.\n\nTente outra área ou volte mais tarde!`,
        );
        await this.sendWelcomeMessage(jid, 'Cidadão');
        const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
        userSessions.set(phoneNumber, updatedSession);
        return;
      }

      // Envia resumo da curadoria
      let curationMessage = `✅ *Curadoria de PLs - ${selectedArea.toUpperCase()}*\n\n`;
      curationMessage += `Encontrei *${curatedPLs.length} PLs relevantes* para você:\n\n`;

      curatedPLs.forEach((pl, index) => {
        curationMessage += `━━━━━━━━━━━━━━━\n`;
        curationMessage += `*${index + 1}. ${pl.siglaTipo} ${pl.numero}/${pl.ano}*\n\n`;
        curationMessage += `📝 ${pl.citizenSummary}\n\n`;
        curationMessage += `⭐ Relevância: ${pl.relevanceScore.toFixed(0)}%\n`;
        curationMessage += `🎯 Impacto: ${pl.impact.impactScore}/10\n`;
        
        // Formata urgência
        let urgencyText = '🟢 Baixa';
        if (pl.impact.urgency === 'high') {
          urgencyText = '🔴 Alta';
        } else if (pl.impact.urgency === 'medium') {
          urgencyText = '🟡 Média';
        }
        curationMessage += `⚡ Urgência: ${urgencyText}\n`;
        
        if (pl.isTrending) {
          curationMessage += `🔥 *Em destaque na mídia!*\n`;
        }
        
        curationMessage += `\n📊 Situação: ${pl.situacao}\n`;
        curationMessage += `\n`;
      });

      curationMessage += `━━━━━━━━━━━━━━━\n\n`;

      await whatsappService.sendText(jid, curationMessage);

      // Salva PLs na sessão e pergunta sobre áudio
      const plsForAudio = curatedPLs.map(pl => ({
        numero: pl.numero,
        ano: pl.ano,
        ementa: pl.ementa,
        citizenSummary: pl.citizenSummary,
      }));

      const updatedSession: WhatsAppSession = { 
        ...session, 
        step: 'waiting_curation_audio_choice',
        curationPLs: plsForAudio,
      };
      userSessions.set(phoneNumber, updatedSession);

      // Pergunta se quer ouvir em áudio
      await whatsappService.sendText(
        jid,
        `🎙️ *Quer ouvir um resumo em áudio?*\n\nVou narrar os principais PLs encontrados.\n\n1️⃣ Sim, quero ouvir\n2️⃣ Não, só texto mesmo`,
      );

    } catch (error) {
      console.error('❌ Erro ao gerar curadoria:', error);
      await whatsappService.sendText(
        jid,
        '❌ Ocorreu um erro ao buscar os PLs. Tente novamente mais tarde.',
      );
      await this.sendWelcomeMessage(jid, 'Cidadão');
      const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
      userSessions.set(phoneNumber, updatedSession);
    }
  }

  /**
   * Processa escolha de áudio da curadoria
   */
  private async handleCurationAudioChoice(
    jid: string,
    text: string,
    session: WhatsAppSession,
    phoneNumber: string,
  ): Promise<void> {
    const textLower = text.toLowerCase().trim();

    // Se não quer áudio
    if (textLower === '2' || textLower.includes('não') || textLower.includes('nao')) {
      await whatsappService.sendText(
        jid,
        '✅ Ok! Espero que as informações sejam úteis.\n\n💡 Digite "Menu" para ver outras opções!',
      );
      const updatedSession: WhatsAppSession = { ...session, step: 'idle', curationPLs: undefined };
      userSessions.set(phoneNumber, updatedSession);
      return;
    }

    // Se quer áudio
    if (textLower === '1' || textLower.includes('sim')) {
      if (!session.curationPLs || session.curationPLs.length === 0) {
        await whatsappService.sendText(jid, '❌ Não encontrei os PLs salvos. Tente gerar a curadoria novamente.');
        const updatedSession: WhatsAppSession = { ...session, step: 'idle', curationPLs: undefined };
        userSessions.set(phoneNumber, updatedSession);
        return;
      }

      await whatsappService.sendText(jid, '🎙️ Gerando áudio... Isso pode levar alguns segundos.');

      try {
        // Cria texto para narração
        let audioText = 'Aqui está o resumo dos projetos de lei encontrados. ';
        
        session.curationPLs.forEach((pl, index) => {
          // Gera resumo curto para cada PL
          const plNumber = `Projeto de Lei ${pl.numero} de ${pl.ano}`;
          audioText += `${index + 1}. ${plNumber}. ${pl.citizenSummary}. `;
        });

        audioText += 'Esses foram os principais projetos de lei. Para mais informações, acesse nossa plataforma.';

        // Limita tamanho do texto (TTS tem limite)
        if (audioText.length > 1500) {
          audioText = `${audioText.substring(0, 1500)}... Para ver todos os detalhes, consulte o texto enviado anteriormente.`;
        }

        // Gera o áudio
        const audioBuffer = await openaiService.generateAudio(audioText);

        // Envia o áudio
        await whatsappService.sendAudio(jid, audioBuffer);
        
        await whatsappService.sendText(
          jid,
          '✅ Áudio enviado! Espero que ajude você a entender melhor os PLs.\n\n💡 Digite "Menu" para ver outras opções!',
        );

      } catch (error) {
        console.error('❌ Erro ao gerar/enviar áudio:', error);
        await whatsappService.sendText(
          jid,
          '❌ Desculpe, não consegui gerar o áudio no momento. Tente novamente mais tarde.',
        );
      }

      // Volta ao estado idle
      const updatedSession: WhatsAppSession = { ...session, step: 'idle', curationPLs: undefined };
      userSessions.set(phoneNumber, updatedSession);
      return;
    }

    // Opção inválida
    await whatsappService.sendText(
      jid,
      '❌ Opção inválida. Digite 1 para ouvir em áudio ou 2 para não ouvir.',
    );
  }

  /**
   * Obtém ou cria sessão do usuário
   */
  private getSession(phoneNumber: string): WhatsAppSession {
    if (!userSessions.has(phoneNumber)) {
      userSessions.set(phoneNumber, { step: 'idle' });
    }
    return userSessions.get(phoneNumber)!;
  }

  /**
   * Endpoint de teste para enviar mensagem manual
   */
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { to, number, message, text } = req.body;
      
      const phoneNumber = to || number;
      const messageText = message || text;

      if (!phoneNumber) {
        res.status(400).json({ error: 'Número de telefone é obrigatório' });
        return;
      }

      if (!messageText) {
        res.status(400).json({ error: 'Mensagem é obrigatória' });
        return;
      }

      // Normaliza o JID
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

      await whatsappService.sendText(jid, messageText);

      res.json({ message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }

  /**
   * Endpoint de teste para enviar resumo de PL
   */
  async sendTestPL(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body;
      
      if (!to) {
        res.status(400).json({ error: 'Número de telefone é obrigatório' });
        return;
      }

      // Normaliza o JID
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      await this.sendPLSummary(jid);

      res.json({ message: 'PL enviado com sucesso!' });
    } catch (error) {
      console.error('❌ Erro ao enviar PL:', error);
      res.status(500).json({ error: 'Erro ao enviar PL' });
    }
  }

  /**
   * Endpoint para obter QR Code
   */
  async getQRCode(req: Request, res: Response): Promise<void> {
    try {
      if (whatsappService.connected) {
        res.json({ connected: true, message: 'WhatsApp já está conectado' });
        return;
      }

      // Aguarda o evento de QR Code
      const qrPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout ao aguardar QR Code')), 30000);
        
        whatsappService.once('qr', (qr: string) => {
          clearTimeout(timeout);
          resolve(qr);
        });
      });

      const qr = await qrPromise;
      res.json({ qr });
    } catch (error) {
      console.error('❌ Erro ao obter QR Code:', error);
      res.status(500).json({ error: 'Erro ao obter QR Code' });
    }
  }

  /**
   * Endpoint para verificar status da conexão
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    res.json({
      connected: whatsappService.connected,
      message: whatsappService.connected ? 'Conectado' : 'Desconectado',
    });
  }
}

export default new BaileysWhatsAppController();
