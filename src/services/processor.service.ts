/**
 * Data Processor Service for Voz.Local Pipeline.
 * 
 * Handles the persistence of interactions and proposals to the database,
 * including validation and data enrichment.
 * 
 * Migrated from Python to TypeScript.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Types for interaction and proposal data
export interface InteractionData {
  cidadaoId: number;
  tipoInteracao: 'opiniao' | 'visualizacao' | 'reacao';
  opiniao?: 'a_favor' | 'contra' | 'pular';
  plId?: number;
  conteudo?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface ProposalData {
  cidadaoId: number;
  conteudo: string;
  tipoConteudo: 'texto' | 'audio_transcrito';
  audioUrl?: string;
  cidade: string;
  grupoInclusao?: string;
  temaPrincipal?: string;
  temasSecundarios?: string[];
  confidenceScore?: number;
  timestamp: Date;
}

export class DataProcessor {
  /**
   * Validate interaction data has all required fields.
   */
  private validateInteractionData(data: Partial<InteractionData>): asserts data is InteractionData {
    const requiredFields: Array<keyof InteractionData> = [
      'cidadaoId',
      'tipoInteracao',
      'timestamp',
    ];

    requiredFields.forEach((field) => {
      if (!(field in data) || data[field] === undefined) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    });

    // Validate tipoInteracao
    const validTipos: Array<InteractionData['tipoInteracao']> = [
      'opiniao',
      'visualizacao',
      'reacao',
    ];
    if (!validTipos.includes(data.tipoInteracao as InteractionData['tipoInteracao'])) {
      throw new ValidationError(
        `Invalid tipoInteracao: ${data.tipoInteracao}. Must be one of: ${validTipos.join(', ')}`,
      );
    }

    // Validate opiniao if tipoInteracao is 'opiniao'
    if (data.tipoInteracao === 'opiniao') {
      if (!data.opiniao) {
        throw new ValidationError("Field 'opiniao' is required when tipoInteracao is 'opiniao'");
      }

      const validOpinioes: Array<InteractionData['opiniao']> = ['a_favor', 'contra', 'pular'];
      if (!validOpinioes.includes(data.opiniao)) {
        throw new ValidationError(
          `Invalid opiniao: ${data.opiniao}. Must be one of: ${validOpinioes.join(', ')}`,
        );
      }
    }
  }

  /**
   * Validate proposal data has all required fields.
   */
  private validateProposalData(data: Partial<ProposalData>): asserts data is ProposalData {
    const requiredFields: Array<keyof ProposalData> = [
      'cidadaoId',
      'conteudo',
      'tipoConteudo',
      'cidade',
      'timestamp',
    ];

    requiredFields.forEach((field) => {
      if (!(field in data) || data[field] === undefined || data[field] === '') {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    });

    // Validate tipoConteudo
    const validTipos: Array<ProposalData['tipoConteudo']> = ['texto', 'audio_transcrito'];
    if (!validTipos.includes(data.tipoConteudo as ProposalData['tipoConteudo'])) {
      throw new ValidationError(
        `Invalid tipoConteudo: ${data.tipoConteudo}. Must be one of: ${validTipos.join(', ')}`,
      );
    }

    // Validate audio_url if tipo_conteudo is 'audio_transcrito'
    if (data.tipoConteudo === 'audio_transcrito' && !data.audioUrl) {
      throw new ValidationError(
        "Field 'audioUrl' is required when tipoConteudo is 'audio_transcrito'",
      );
    }
  }

  /**
   * Get or create a citizen (Cidadao) record.
   */
  async getOrCreateCidadao(data: {
    telefoneHash: string;
    cidade: string;
    grupoInclusao?: string;
  }): Promise<{ id: number; created: boolean }> {
    try {
      // Try to find existing citizen
      const existing = await prisma.cidadao.findUnique({
        where: { telefone_hash: data.telefoneHash },
      });

      if (existing) {
        return { id: existing.id, created: false };
      }

      // Create new citizen
      const newCidadao = await prisma.cidadao.create({
        data: {
          telefone_hash: data.telefoneHash,
          cidade: data.cidade,
          grupo_inclusao: data.grupoInclusao || null,
        },
      });

      return { id: newCidadao.id, created: true };
    } catch (error) {
      console.error('Error in getOrCreateCidadao:', error);
      throw new Error('Failed to get or create citizen');
    }
  }

  /**
   * Process and persist an interaction to the database.
   */
  async processInteraction(data: Partial<InteractionData>): Promise<{ id: number }> {
    try {
      // Validate data
      this.validateInteractionData(data);

      // Persist to database
      const interacao = await prisma.interacao.create({
        data: {
          cidadao_id: data.cidadaoId,
          pl_id: data.plId || null,
          tipo_interacao: data.tipoInteracao,
          opiniao: data.opiniao || null,
          conteudo: data.conteudo || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          timestamp: data.timestamp,
        },
      });

      console.log(`Interaction processed: ID ${interacao.id}`);
      return { id: interacao.id };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Error processing interaction:', error);
      throw new Error('Failed to process interaction');
    }
  }

  /**
   * Process and persist a proposal to the database.
   */
  async processProposal(data: Partial<ProposalData>): Promise<{ id: number }> {
    try {
      // Validate data
      this.validateProposalData(data);

      // Persist to database
      const proposta = await prisma.propostaPauta.create({
        data: {
          cidadao_id: data.cidadaoId,
          conteudo: data.conteudo,
          tipo_conteudo: data.tipoConteudo,
          audio_url: data.audioUrl || null,
          cidade: data.cidade,
          grupo_inclusao: data.grupoInclusao || null,
          tema_principal: data.temaPrincipal || null,
          temas_secundarios: data.temasSecundarios
            ? JSON.stringify(data.temasSecundarios)
            : null,
          confidence_score: data.confidenceScore || null,
          timestamp: data.timestamp,
        },
      });

      console.log(`Proposal processed: ID ${proposta.id}`);
      return { id: proposta.id };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Error processing proposal:', error);
      throw new Error('Failed to process proposal');
    }
  }

  /**
   * Batch process multiple interactions.
   */
  async processInteractionsBatch(
    interactions: Array<Partial<InteractionData>>,
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    await Promise.allSettled(
      interactions.map(async (interaction, index) => {
        try {
          await this.processInteraction(interaction);
          successCount += 1;
        } catch (error) {
          errorCount += 1;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Interaction ${index}: ${errorMessage}`);
        }
      }),
    );

    return { successCount, errorCount, errors };
  }

  /**
   * Get interaction statistics for a citizen.
   */
  async getCidadaoStats(cidadaoId: number): Promise<{
    totalInteracoes: number;
    totalPropostas: number;
    opinioesPorTipo: Record<string, number>;
  }> {
    try {
      const [totalInteracoes, totalPropostas, opinioes] = await Promise.all([
        prisma.interacao.count({ where: { cidadao_id: cidadaoId } }),
        prisma.propostaPauta.count({ where: { cidadao_id: cidadaoId } }),
        prisma.interacao.groupBy({
          by: ['opiniao'],
          where: { cidadao_id: cidadaoId, opiniao: { not: null } },
          _count: true,
        }),
      ]);

      const opinioesPorTipo: Record<string, number> = {};
      opinioes.forEach((item) => {
        if (item.opiniao) {
          opinioesPorTipo[item.opiniao] = item._count;
        }
      });

      return {
        totalInteracoes,
        totalPropostas,
        opinioesPorTipo,
      };
    } catch (error) {
      console.error('Error getting citizen stats:', error);
      throw new Error('Failed to get citizen statistics');
    }
  }
}

export default DataProcessor;
