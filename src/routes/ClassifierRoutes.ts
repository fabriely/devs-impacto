/**
 * Classifier Routes for Voz.Local Pipeline.
 * 
 * Routes for AI-powered classification and similarity detection.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import AIClassifier, { TEMAS } from '../services/classifier.service';

const router = Router();
const aiClassifier = new AIClassifier();

// Validation schemas
const classifyThemeSchema = z.object({
  conteudo: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
});

const similaritySchema = z.object({
  conteudo: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  threshold: z.number().min(0).max(1).optional().default(0.75),
});

const batchClassifySchema = z.object({
  propostas: z.array(z.string().min(10)).max(50, 'Máximo de 50 propostas por lote'),
});

/**
 * POST /api/classifier/theme
 * Classify the theme of a citizen proposal
 */
router.post('/theme', async (req: Request, res: Response) => {
  try {
    const { conteudo } = classifyThemeSchema.parse(req.body);
    
    const result = await aiClassifier.classifyTheme(conteudo);
    
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /theme:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to classify theme',
    });
  }
});

/**
 * POST /api/classifier/embedding
 * Generate embedding for a text
 */
router.post('/embedding', async (req: Request, res: Response) => {
  try {
    const { conteudo } = classifyThemeSchema.parse(req.body);
    
    const embedding = await aiClassifier.generateEmbedding(conteudo);
    
    return res.status(200).json({
      success: true,
      data: {
        embedding,
        dimensions: embedding.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /embedding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate embedding',
    });
  }
});

/**
 * POST /api/classifier/batch
 * Batch classify multiple proposals
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { propostas } = batchClassifySchema.parse(req.body);
    
    const results = await aiClassifier.classifyBatch(propostas);
    
    return res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /batch:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to classify batch',
    });
  }
});

/**
 * POST /api/classifier/topics
 * Extract key topics from a proposal
 */
router.post('/topics', async (req: Request, res: Response) => {
  try {
    const { conteudo } = classifyThemeSchema.parse(req.body);
    
    const topics = await aiClassifier.extractKeyTopics(conteudo);
    
    return res.status(200).json({
      success: true,
      data: {
        topics,
        count: topics.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    
    console.error('Error in POST /topics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to extract topics',
    });
  }
});

/**
 * GET /api/classifier/themes
 * Get list of available themes
 */
router.get('/themes', (req: Request, res: Response) =>
  res.status(200).json({
    success: true,
    data: TEMAS,
    count: TEMAS.length,
  }),
);

export default router;
