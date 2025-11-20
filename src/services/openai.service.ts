import OpenAI from 'openai';
import env from '../env';

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Gera um resumo simplificado de um Projeto de Lei
   */
  async summarizePL(plText: string, plNumber: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que explica Projetos de Lei de forma simples e acessível para cidadãos comuns. 
                Seu objetivo é resumir o PL em linguagem clara, destacando:
                - O que o PL propõe
                - Como isso afeta a vida das pessoas
                - Principais pontos positivos e negativos
                Mantenha o resumo em até 300 palavras.`,
          },
          {
            role: 'user',
            content: `Resuma este Projeto de Lei ${plNumber}:\n\n${plText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || 'Não foi possível gerar o resumo.';
    } catch (error) {
      console.error('Erro ao gerar resumo com OpenAI:', error);
      throw new Error('Erro ao processar resumo do PL');
    }
  }

  /**
   * Responde perguntas sobre o impacto de um PL
   */
  async answerQuestion(plSummary: string, question: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que responde perguntas sobre Projetos de Lei de forma clara e objetiva.
            Use o resumo do PL fornecido para responder às perguntas dos cidadãos.`,
          },
          {
            role: 'user',
            content: `Resumo do PL: ${plSummary}\n\nPergunta: ${question}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return completion.choices[0].message.content || 'Não foi possível responder à pergunta.';
    } catch (error) {
      console.error('Erro ao responder pergunta com OpenAI:', error);
      throw new Error('Erro ao processar pergunta');
    }
  }

  /**
   * Transcreve áudio para texto usando Whisper
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      // Cria um File-like object do buffer
      const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
      const file = new File([blob], filename, { 
        type: 'audio/ogg', 
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'pt',
      });

      return transcription.text;
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw new Error('Erro ao transcrever áudio');
    }
  }

  /**
   * Gera áudio a partir de texto usando TTS
   */
  async generateAudio(text: string): Promise<Buffer> {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Erro ao gerar áudio:', error);
      throw new Error('Erro ao gerar áudio');
    }
  }
}

export default new OpenAIService();
