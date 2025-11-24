/**
 * Processor Routes for Voz.Local Pipeline.
 * 
 * Routes for processing citizen interactions and proposals.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import DataProcessor from '../services/processor.service';
import AIClassifier from '../services/classifier.service';

const router = Router();
const dataProcessor = new DataProcessor();
const aiClassifier = new AIClassifier();

// Validation schemas
const interactionSchema = z.object({
  cidadaoId: z.number().int().positive(),
  tipoInteracao: z.enum(['opiniao', 'visualizacao', 'reacao']),
  opiniao: z.enum(['a_favor', 'contra', 'pular']).optional(),
  plId: z.number().int().positive().optional(),
  conteudo: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

const proposalSchema = z.object({
  cidadaoId: z.number().int().positive(),
  conteudo: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  tipoConteudo: z.enum(['texto', 'audio_transcrito']),
  audioUrl: z.string().url().optional(),
  cidade: z.string().min(2),
  grupoInclusao: z.string().optional(),
  autoClassify: z.boolean().optional().default(true),
});

const createCidadaoSchema = z.object({
  telefoneHash: z.string().min(10),
  cidade: z.string().min(2),
  grupoInclusao: z.string().optional(),
});

/**
 * POST /api/processor/interactions
 * Process a citizen interaction
 */
router.post('/interactions', async (req: Request, res: Response) => {
  try {
    const data = interactionSchema.parse(req.body);
    
    const interactionData = {
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };
    
    const result = await dataProcessor.processInteraction(interactionData);
    
    return res.status(201).json({
      success: true,
      data: result,
      message: 'Interaction processed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /interactions:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process interaction',
    });
  }
});

/**
 * POST /api/processor/proposals
 * Process a citizen proposal (with optional auto-classification)
 */
router.post('/proposals', async (req: Request, res: Response) => {
  try {
    const data = proposalSchema.parse(req.body);
    
    let classification;
    
    // Auto-classify if enabled
    if (data.autoClassify) {
      try {
        classification = await aiClassifier.classifyTheme(data.conteudo);
      } catch (classifyError) {
        console.warn('Classification failed, continuing without it:', classifyError);
      }
    }
    
    const proposalData = {
      cidadaoId: data.cidadaoId,
      conteudo: data.conteudo,
      tipoConteudo: data.tipoConteudo,
      audioUrl: data.audioUrl,
      cidade: data.cidade,
      grupoInclusao: data.grupoInclusao,
      temaPrincipal: classification?.temaPrincipal,
      temasSecundarios: classification?.temasSecundarios,
      confidenceScore: classification?.confidenceScore,
      timestamp: new Date(),
    };
    
    const result = await dataProcessor.processProposal(proposalData);
    
    return res.status(201).json({
      success: true,
      data: {
        ...result,
        classification: classification || null,
        needsReview: classification?.needsReview || false,
      },
      message: 'Proposal processed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /proposals:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process proposal',
    });
  }
});

/**
 * POST /api/processor/interactions/batch
 * Process multiple interactions in batch
 */
router.post('/interactions/batch', async (req: Request, res: Response) => {
  try {
    const { interactions } = z
      .object({
        interactions: z.array(interactionSchema).max(100, 'Máximo de 100 interações por lote'),
      })
      .parse(req.body);
    
    const interactionsData = interactions.map((data) => ({
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    }));
    
    const result = await dataProcessor.processInteractionsBatch(interactionsData);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: `Processed ${result.successCount} interactions, ${result.errorCount} failed`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /interactions/batch:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process batch interactions',
    });
  }
});

/**
 * POST /api/processor/citizens
 * Create or get a citizen
 */
router.post('/citizens', async (req: Request, res: Response) => {
  try {
    const data = createCidadaoSchema.parse(req.body);
    
    const result = await dataProcessor.getOrCreateCidadao(data);
    
    return res.status(result.created ? 201 : 200).json({
      success: true,
      data: result,
      message: result.created ? 'Citizen created successfully' : 'Citizen already exists',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /citizens:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create citizen',
    });
  }
});

/**
 * GET /api/processor/citizens/:id/stats
 * Get statistics for a citizen
 */
router.get('/citizens/:id/stats', async (req: Request, res: Response) => {
  try {
    const cidadaoId = parseInt(req.params.id, 10);
    
    if (Number.isNaN(cidadaoId) || cidadaoId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citizen ID',
      });
    }
    
    const stats = await dataProcessor.getCidadaoStats(cidadaoId);
    
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in GET /citizens/:id/stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get citizen statistics',
    });
  }
});

export default router;
