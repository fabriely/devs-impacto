/**
 * Proposals Routes for Voz.Local Pipeline.
 * 
 * Routes for managing and retrieving citizen proposals.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/proposals/recent
 * Get most recent citizen proposals
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const tema = req.query.tema as string;
    const cidade = req.query.cidade as string;

    const where: Record<string, unknown> = {};
    
    if (tema) {
      where.tema_principal = tema;
    }
    
    if (cidade) {
      where.cidade = cidade;
    }

    const [propostas, total] = await Promise.all([
      prisma.propostaPauta.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          conteudo: true,
          tema_principal: true,
          temas_secundarios: true,
          confidence_score: true,
          cidade: true,
          grupo_inclusao: true,
          tipo_conteudo: true,
          timestamp: true,
          created_at: true,
        },
      }),
      prisma.propostaPauta.count({ where }),
    ]);

    const formattedPropostas = propostas.map((p) => ({
      id: p.id,
      conteudo: p.conteudo,
      temaPrincipal: p.tema_principal,
      temasSecundarios: p.temas_secundarios ? JSON.parse(p.temas_secundarios) : [],
      confidenceScore: p.confidence_score,
      cidade: p.cidade,
      grupoInclusao: p.grupo_inclusao,
      tipoConteudo: p.tipo_conteudo,
      timestamp: p.timestamp,
      createdAt: p.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedPropostas,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error in GET /recent:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent proposals',
    });
  }
});

/**
 * GET /api/proposals/by-theme
 * Get proposals grouped by theme
 */
router.get('/by-theme', async (req: Request, res: Response) => {
  try {
    const proposals = await prisma.propostaPauta.groupBy({
      by: ['tema_principal'],
      _count: {
        tema_principal: true,
      },
      orderBy: {
        _count: {
          tema_principal: 'desc',
        },
      },
    });

    const formatted = proposals.map((p) => ({
      tema: p.tema_principal,
      // eslint-disable-next-line no-underscore-dangle
            count: p._count.tema_principal,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error in GET /by-theme:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch proposals by theme',
    });
  }
});

/**
 * GET /api/proposals/by-city
 * Get proposals grouped by city
 */
router.get('/by-city', async (req: Request, res: Response) => {
  try {
    const proposals = await prisma.propostaPauta.groupBy({
      by: ['cidade'],
      _count: {
        cidade: true,
      },
      orderBy: {
        _count: {
          cidade: 'desc',
        },
      },
      take: 20,
    });

    const formatted = proposals.map((p) => ({
      cidade: p.cidade,
      // eslint-disable-next-line no-underscore-dangle
      count: p._count.cidade,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error in GET /by-city:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch proposals by city',
    });
  }
});

/**
 * GET /api/proposals/:id
 * Get single proposal by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    const proposta = await prisma.propostaPauta.findUnique({
      where: { id },
      include: {
        cidadao: {
          select: {
            cidade: true,
            grupo_inclusao: true,
            created_at: true,
          },
        },
      },
    });

    if (!proposta) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
      });
    }

    const formatted = {
      id: proposta.id,
      conteudo: proposta.conteudo,
      temaPrincipal: proposta.tema_principal,
      temasSecundarios: proposta.temas_secundarios ? JSON.parse(proposta.temas_secundarios) : [],
      confidenceScore: proposta.confidence_score,
      cidade: proposta.cidade,
      grupoInclusao: proposta.grupo_inclusao,
      tipoConteudo: proposta.tipo_conteudo,
      audioUrl: proposta.audio_url,
      timestamp: proposta.timestamp,
      createdAt: proposta.created_at,
      cidadao: proposta.cidadao,
    };

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error in GET /:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch proposal',
    });
  }
});

/**
 * GET /api/proposals/stats/summary
 * Get overall proposals statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const [total, byType, avgConfidence] = await Promise.all([
      prisma.propostaPauta.count(),
      prisma.propostaPauta.groupBy({
        by: ['tipo_conteudo'],
        _count: {
          tipo_conteudo: true,
        },
      }),
      prisma.propostaPauta.aggregate({
        _avg: {
          confidence_score: true,
        },
      }),
    ]);

    const typeBreakdown: Record<string, number> = {};
    byType.forEach((item) => {
      // eslint-disable-next-line no-underscore-dangle
      typeBreakdown[item.tipo_conteudo] = item._count.tipo_conteudo;
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        typeBreakdown,
        // eslint-disable-next-line no-underscore-dangle
        averageConfidence: avgConfidence._avg.confidence_score || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /stats/summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch proposals stats',
    });
  }
});

export default router;
