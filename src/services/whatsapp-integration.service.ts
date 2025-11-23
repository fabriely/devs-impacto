/**
 * WhatsApp Integration Service
 * 
 * Integra as interações do WhatsApp com o pipeline de dados do Voz.Local:
 * - Registra cidadãos automaticamente
 * - Salva todas as interações (visualizações, opiniões, áudios)
 * - Classifica propostas com AI
 * - Alimenta o dashboard com dados em tempo real
 */

import crypto from 'crypto';
import DataProcessor from './processor.service';
import AIClassifier from './classifier.service';

const dataProcessor = new DataProcessor();
const aiClassifier = new AIClassifier();

class WhatsAppIntegrationService {
  /**
   * Cria hash do telefone para LGPD compliance
   */
  private hashPhoneNumber(phoneNumber: string): string {
    return crypto.createHash('sha256').update(phoneNumber).digest('hex');
  }

  /**
   * Extrai cidade do telefone (DDD)
   * TODO: Melhorar isso com base real ou pedir ao usuário
   */
  private getCityFromPhone(phoneNumber: string): string {
    const ddd = phoneNumber.substring(0, 2);
    
    // Mapeamento simplificado de DDDs (expandir conforme necessário)
    const dddMap = new Map<string, string>([
      ['11', 'São Paulo'],
      ['21', 'Rio de Janeiro'],
      ['31', 'Belo Horizonte'],
      ['41', 'Curitiba'],
      ['51', 'Porto Alegre'],
      ['61', 'Brasília'],
      ['71', 'Salvador'],
      ['81', 'Recife'],
      ['85', 'Fortaleza'],
      ['91', 'Belém'],
    ]);

    return dddMap.get(ddd) || 'Não identificada';
  }

  /**
   * Registra ou obtém cidadão
   */
  async ensureCitizen(phoneNumber: string, userName?: string): Promise<number> {
    try {
      const telefoneHash = this.hashPhoneNumber(phoneNumber);
      const cidade = this.getCityFromPhone(phoneNumber);

      const result = await dataProcessor.getOrCreateCidadao({
        telefoneHash,
        cidade,
      });

      if (result.created) {
        console.log(`👤 Novo cidadão criado: ID ${result.id} (${userName || 'Anônimo'}) - ${cidade}`);
      } else {
        console.log(`👤 Cidadão existente: ID ${result.id}`);
      }

      return result.id;
    } catch (error) {
      console.error('❌ Erro ao garantir cidadão:', error);
      throw error;
    }
  }

  /**
   * Registra visualização de PL
   */
  async trackPLVisualization(data: {
    phoneNumber: string;
    plNumber: string;
    userName?: string;
  }): Promise<void> {
    try {
      const cidadaoId = await this.ensureCitizen(data.phoneNumber, data.userName);

      await dataProcessor.processInteraction({
        cidadaoId,
        tipoInteracao: 'visualizacao',
        conteudo: `Visualizou PL ${data.plNumber}`,
        metadata: {
          pl_numero: data.plNumber,
          origem: 'whatsapp',
        },
        timestamp: new Date(),
      });

      console.log(`👁️ Visualização registrada: Cidadão ${cidadaoId} - PL ${data.plNumber}`);
    } catch (error) {
      console.error('❌ Erro ao registrar visualização:', error);
    }
  }

  /**
   * Registra opinião sobre PL
   */
  async trackPLOpinion(data: {
    phoneNumber: string;
    plNumber: string;
    opinion: 'a_favor' | 'contra' | 'pular';
    userName?: string;
  }): Promise<void> {
    try {
      const cidadaoId = await this.ensureCitizen(data.phoneNumber, data.userName);

      await dataProcessor.processInteraction({
        cidadaoId,
        tipoInteracao: 'opiniao',
        opiniao: data.opinion,
        conteudo: `Opinião sobre PL ${data.plNumber}: ${data.opinion}`,
        metadata: {
          pl_numero: data.plNumber,
          origem: 'whatsapp',
        },
        timestamp: new Date(),
      });

      console.log(`💬 Opinião registrada: Cidadão ${cidadaoId} - ${data.opinion} - PL ${data.plNumber}`);
    } catch (error) {
      console.error('❌ Erro ao registrar opinião:', error);
    }
  }

  /**
   * Processa e salva proposta de cidadão (texto ou áudio transcrito)
   */
  async processCitizenProposal(data: {
    phoneNumber: string;
    content: string;
    isAudioTranscription?: boolean;
    audioUrl?: string;
    userName?: string;
    grupoInclusao?: string;
  }): Promise<{
    id: number;
    classification: {
      temaPrincipal: string;
      temasSecundarios: string[];
      confidenceScore: number;
    };
  } | null> {
    try {
      const cidadaoId = await this.ensureCitizen(data.phoneNumber, data.userName);
      const cidade = this.getCityFromPhone(data.phoneNumber);

      // Classifica automaticamente com AI
      console.log('🤖 Classificando proposta com AI...');
      const classification = await aiClassifier.classifyTheme(data.content);

      // Salva proposta no banco
      const result = await dataProcessor.processProposal({
        cidadaoId,
        conteudo: data.content,
        tipoConteudo: data.isAudioTranscription ? 'audio_transcrito' : 'texto',
        audioUrl: data.audioUrl,
        cidade,
        grupoInclusao: data.grupoInclusao,
        temaPrincipal: classification.temaPrincipal,
        temasSecundarios: classification.temasSecundarios,
        confidenceScore: classification.confidenceScore,
        timestamp: new Date(),
      });

      console.log(`📝 Proposta salva: ID ${result.id} - Tema: ${classification.temaPrincipal} (${classification.confidenceScore.toFixed(2)})`);

      return {
        id: result.id,
        classification: {
          temaPrincipal: classification.temaPrincipal,
          temasSecundarios: classification.temasSecundarios,
          confidenceScore: classification.confidenceScore,
        },
      };
    } catch (error) {
      console.error('❌ Erro ao processar proposta:', error);
      return null;
    }
  }

  /**
   * Registra pergunta do cidadão sobre um PL
   */
  async trackPLQuestion(data: {
    phoneNumber: string;
    plNumber: string;
    question: string;
    userName?: string;
  }): Promise<void> {
    try {
      const cidadaoId = await this.ensureCitizen(data.phoneNumber, data.userName);

      await dataProcessor.processInteraction({
        cidadaoId,
        tipoInteracao: 'reacao',
        conteudo: data.question,
        metadata: {
          pl_numero: data.plNumber,
          tipo: 'pergunta',
          origem: 'whatsapp',
        },
        timestamp: new Date(),
      });

      console.log(`❓ Pergunta registrada: Cidadão ${cidadaoId} - PL ${data.plNumber}`);
    } catch (error) {
      console.error('❌ Erro ao registrar pergunta:', error);
    }
  }

  /**
   * Registra interação geral (navegação, comandos, etc)
   */
  async trackGeneralInteraction(data: {
    phoneNumber: string;
    action: string;
    content?: string;
    userName?: string;
  }): Promise<void> {
    try {
      const cidadaoId = await this.ensureCitizen(data.phoneNumber, data.userName);

      await dataProcessor.processInteraction({
        cidadaoId,
        tipoInteracao: 'reacao',
        conteudo: data.content || data.action,
        metadata: {
          action: data.action,
          origem: 'whatsapp',
        },
        timestamp: new Date(),
      });

      console.log(`🔄 Interação registrada: Cidadão ${cidadaoId} - ${data.action}`);
    } catch (error) {
      console.error('❌ Erro ao registrar interação:', error);
    }
  }

  /**
   * Obtém estatísticas de um cidadão
   */
  async getCitizenStats(phoneNumber: string): Promise<{
    totalInteracoes: number;
    totalPropostas: number;
    opinioesPorTipo: Record<string, number>;
  } | null> {
    try {
      const telefoneHash = this.hashPhoneNumber(phoneNumber);
      const cidade = this.getCityFromPhone(phoneNumber);

      // Tenta obter cidadão existente
      const result = await dataProcessor.getOrCreateCidadao({
        telefoneHash,
        cidade,
      });

      const stats = await dataProcessor.getCidadaoStats(result.id);
      return stats;
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

export default new WhatsAppIntegrationService();
