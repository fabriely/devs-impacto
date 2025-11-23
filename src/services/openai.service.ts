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
            content: `Você é um assistente que explica Projetos de Lei de forma MUITO SIMPLES para brasileiros comuns.
            REGRAS IMPORTANTES:
            - Use linguagem coloquial e direta
            - Máximo de 100 palavras (brasileiros leem pouco!)
            - Foque no que REALMENTE importa para o cidadão
            - Evite juridiquês e termos técnicos
            - Seja objetivo: o que muda na prática?

            Estrutura ideal:
            1. Uma frase sobre o que o PL faz (15 palavras)
            2. Como isso afeta você (30 palavras)
            3. Ponto principal (20 palavras)`,
          },
          {
            role: 'user',
            content: `Resuma de forma BEM CURTA o ${plNumber}:\n\n${plText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
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

  /**
   * Gera resumo em áudio otimizado para narração (mais curto e natural)
   */
  async generateAudioSummary(plText: string, plNumber: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você cria resumos de Projetos de Lei para serem NARRADOS em áudio.
            REGRAS PARA NARRAÇÃO:
            - Máximo 60 palavras (áudio precisa ser rápido!)
            - Tom de conversa, como se estivesse falando com um amigo
            - Sem emojis ou símbolos especiais
            - Números por extenso quando possível
            - Seja direto: o que muda na vida da pessoa?

            Formato: Uma ou duas frases curtas e impactantes.`,
          },
          {
            role: 'user',
            content: `Crie um resumo CURTO para narração em áudio do ${plNumber}:\n\n${plText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return completion.choices[0].message.content || 'Não foi possível gerar o resumo.';
    } catch (error) {
      console.error('Erro ao gerar resumo para áudio:', error);
      throw new Error('Erro ao processar resumo para áudio');
    }
  }

  /**
   * Faz uma chamada genérica à API de chat
   */
  async chat(prompt: string, systemMessage?: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage || 'Você é um assistente útil.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na chamada de chat:', error);
      throw new Error('Erro ao processar chat');
    }
  }
}

export default new OpenAIService();
