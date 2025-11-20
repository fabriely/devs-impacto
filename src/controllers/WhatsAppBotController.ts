import { Request, Response } from 'express';
import evolutionService from '../services/evolution.service';
import openaiService from '../services/openai.service';

interface WhatsAppSession {
  step: 'idle' | 'waiting_question' | 'waiting_opinion';
  plSummary?: string;
  plNumber?: string;
}

// Armazena o estado da conversa de cada usuário
// Em produção, isso deve estar em um banco de dados ou Redis
const userSessions = new Map<string, WhatsAppSession>();

class WhatsAppBotController {
  /**
   * Webhook que recebe mensagens do WhatsApp via Evolution API
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      // Parse da mensagem
      const message = evolutionService.parseWebhookMessage(webhookData);
      
      if (!message) {
        res.status(200).json({ message: 'Mensagem ignorada' });
        return;
      }

      const phoneNumber = evolutionService.extractPhoneNumber(message.key.remoteJid);
      const userName = message.pushName || 'Cidadão';

      // Processa texto
      const textMessage = evolutionService.extractText(message);
      if (textMessage) {
        await this.handleTextMessage(phoneNumber, textMessage, userName);
        res.status(200).json({ message: 'Processado' });
        return;
      }

      // Processa áudio
      const audioUrl = evolutionService.extractAudioUrl(message);
      if (audioUrl) {
        await this.handleAudioMessage(phoneNumber, audioUrl, userName);
        res.status(200).json({ message: 'Processado' });
        return;
      }

      res.status(200).json({ message: 'Tipo de mensagem não suportado' });
    } catch (error) {
      console.error('Erro no webhook:', error);
      res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
  }

  /**
   * Processa mensagem de texto
   */
  private async handleTextMessage(
    phoneNumber: string,
    text: string,
    userName: string,
  ): Promise<void> {
    const session = this.getSession(phoneNumber);
    const textLower = text.toLowerCase().trim();

    // Comandos especiais
    if (textLower === 'menu' || textLower === 'inicio' || textLower === 'oi' || textLower === 'olá') {
      await this.sendWelcomeMessage(phoneNumber, userName);
      const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
      userSessions.set(phoneNumber, updatedSession);
      return;
    }

    // Fluxo baseado no estado da sessão
    switch (session.step) {
      case 'idle':
        await this.sendWelcomeMessage(phoneNumber, userName);
        break;

      case 'waiting_question':
        await this.handleQuestion(phoneNumber, text, session);
        break;

      case 'waiting_opinion':
        await this.handleOpinion(phoneNumber, text, session);
        break;

      default:
        await this.sendWelcomeMessage(phoneNumber, userName);
    }
  }

  /**
   * Processa mensagem de áudio
   */
  private async handleAudioMessage(
    phoneNumber: string,
    audioUrl: string,
    userName: string,
  ): Promise<void> {
    try {
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '🎧 Recebendo seu áudio... Um momento!',
      });

      // Baixa o áudio
      const audioBuffer = await evolutionService.downloadAudio(audioUrl);

      // Transcreve com Whisper
      const transcription = await openaiService.transcribeAudio(audioBuffer, 'audio.ogg');

      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: `📝 Você disse: "${transcription}"`,
      });

      // Processa o texto transcrito
      await this.handleTextMessage(phoneNumber, transcription, userName);
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '❌ Desculpe, não consegui processar seu áudio. Tente novamente ou envie uma mensagem de texto.',
      });
    }
  }

  /**
   * Envia mensagem de boas-vindas
   */
  private async sendWelcomeMessage(phoneNumber: string, userName: string): Promise<void> {
    const message = `Olá, ${userName}! 👋

        Sou o assistente da plataforma Devs Impacto! 🏛️

        Estou aqui para te ajudar a entender Projetos de Lei de forma simples e participar da democracia.

        📋 *Menu de opções:*

        1️⃣ Ver novo PL
        2️⃣ Fazer pergunta sobre PL
        3️⃣ Registrar opinião
        4️⃣ Ver dashboard público

        Digite o número da opção ou envie uma mensagem de *áudio* que eu entendo! 🎙️`;

    await evolutionService.sendTextMessage({
      number: phoneNumber,
      text: message,
    });
  }

  /**
   * Envia resumo de um PL (exemplo mockado por enquanto)
   */
  async sendPLSummary(phoneNumber: string): Promise<void> {
    try {
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '📄 Buscando novo Projeto de Lei...',
      });

      // TODO: Buscar PL real da API da Câmara
      // Por enquanto, usamos um exemplo
      const plNumber = 'PL 1234/2025';
      const plText = `Projeto de Lei que estabelece normas para proteção de dados pessoais 
      no ambiente digital, garantindo direitos fundamentais de liberdade e privacidade.`;

      const summary = await openaiService.summarizePL(plText, plNumber);

      const session = this.getSession(phoneNumber);
      session.plNumber = plNumber;
      session.plSummary = summary;
      session.step = 'waiting_question';

      // Envia resumo
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: `📋 *${plNumber}*\n\n${summary}`,
      });

      // Pergunta se quer áudio
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: `🎙️ Quer ouvir este resumo em áudio?\n\n1️⃣ Sim\n2️⃣ Não\n\nOu faça uma pergunta sobre o PL!`,
      });
    } catch (error) {
      console.error('Erro ao enviar resumo:', error);
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '❌ Erro ao buscar PL. Tente novamente mais tarde.',
      });
    }
  }

  /**
   * Processa pergunta sobre o PL
   */
  private async handleQuestion(
    phoneNumber: string,
    question: string,
    session: WhatsAppSession,
  ): Promise<void> {
    try {
      // Se usuário quer áudio
      if (question === '1' && session.plSummary) {
        await evolutionService.sendTextMessage({
          number: phoneNumber,
          text: '🔊 Gerando áudio...',
        });

        const audioBuffer = await openaiService.generateAudio(session.plSummary);
        
        await evolutionService.sendAudioMessage({
          number: phoneNumber,
          audioBuffer,
          filename: 'resumo.mp3',
        });

        await evolutionService.sendTextMessage({
          number: phoneNumber,
          text: 'Tem alguma dúvida sobre este PL? Pode perguntar!',
        });
        return;
      }

      // Se não quer áudio
      if (question === '2') {
        await evolutionService.sendTextMessage({
          number: phoneNumber,
          text: 'Tem alguma dúvida sobre este PL? Pode perguntar!',
        });
        return;
      }

      // Responde a pergunta
      if (!session.plSummary) {
        await evolutionService.sendTextMessage({
          number: phoneNumber,
          text: 'Por favor, primeiro veja um PL para fazer perguntas sobre ele.',
        });
        return;
      }

      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '🤔 Pensando na resposta...',
      });

      const answer = await openaiService.answerQuestion(session.plSummary, question);

      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: `💡 ${answer}`,
      });

      // Pergunta sobre opinião
      await this.askForOpinion(phoneNumber, session);
    } catch (error) {
      console.error('Erro ao responder pergunta:', error);
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '❌ Erro ao processar sua pergunta. Tente novamente.',
      });
    }
  }

  /**
   * Pergunta a opinião do cidadão
   */
  private async askForOpinion(
    phoneNumber: string,
    session: WhatsAppSession,
  ): Promise<void> {
    const updatedSession: WhatsAppSession = { ...session, step: 'waiting_opinion' };
    userSessions.set(phoneNumber, updatedSession);

    await evolutionService.sendTextMessage({
      number: phoneNumber,
      text: `🗳️ *Quer registrar sua opinião sobre este PL?*\n\n👍 A favor\n👎 Contra\n⏭️ Pular`,
    });
  }

  /**
   * Registra opinião do cidadão
   */
  private async handleOpinion(
    phoneNumber: string,
    opinion: string,
    session: WhatsAppSession,
  ): Promise<void> {
    const opinionLower = opinion.toLowerCase().trim();

    if (opinionLower.includes('favor') || opinionLower === '👍' || opinionLower === '1') {
      // TODO: Salvar no banco de dados
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '✅ Opinião registrada: A FAVOR\n\nSua participação é muito importante! 🙌',
      });
    } else if (opinionLower.includes('contra') || opinionLower === '👎' || opinionLower === '2') {
      // TODO: Salvar no banco de dados
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '✅ Opinião registrada: CONTRA\n\nSua participação é muito importante! 🙌',
      });
    } else {
      await evolutionService.sendTextMessage({
        number: phoneNumber,
        text: '⏭️ Ok, vamos para o próximo!',
      });
    }

    const updatedSession: WhatsAppSession = { ...session, step: 'idle' };
    userSessions.set(phoneNumber, updatedSession);
    await this.sendWelcomeMessage(phoneNumber, 'Cidadão');
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
      const { number, text } = req.body;

      await evolutionService.sendTextMessage({ number, text });

      res.json({ message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }

  /**
   * Endpoint de teste para enviar resumo de PL
   */
  async sendTestPL(req: Request, res: Response): Promise<void> {
    try {
      const { number } = req.body;

      await this.sendPLSummary(number);

      res.json({ message: 'PL enviado com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar PL:', error);
      res.status(500).json({ error: 'Erro ao enviar PL' });
    }
  }
}

export default new WhatsAppBotController();
