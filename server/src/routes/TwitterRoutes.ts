/**
 * Twitter Routes - Gerenciamento de integração com Twitter
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import twitterService from '../services/twitter.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/twitter/status
 * Verifica o status da conexão com Twitter
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isEnabled = twitterService.isEnabled();
    const isConnected = isEnabled ? await twitterService.testConnection() : false;

    let message = 'Twitter não configurado. Configure as variáveis de ambiente.';
    if (isEnabled) {
      message = isConnected
        ? 'Twitter conectado e funcionando'
        : 'Twitter configurado mas falha na conexão';
    }

    res.json({
      success: true,
      data: {
        enabled: isEnabled,
        connected: isConnected,
        message,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status do Twitter:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status',
    });
  }
});

/**
 * POST /api/twitter/tweet/pl/:id
 * Publica tweet manualmente sobre um PL específico
 */
router.post('/tweet/pl/:id', async (req: Request, res: Response) => {
  try {
    const plId = Number(req.params.id);

    if (Number.isNaN(plId)) {
      res.status(400).json({
        success: false,
        error: 'ID inválido',
      });
      return;
    }

    // Busca o PL no banco
    const pl = await prisma.projetoLei.findUnique({
      where: { id: plId },
    });

    if (!pl) {
      res.status(404).json({
        success: false,
        error: 'PL não encontrado',
      });
      return;
    }

    // Publica no Twitter
    const result = await twitterService.tweetNewPL({
      numero: pl.pl_id,
      titulo: pl.titulo,
      resumo: pl.resumo || '',
      tema: pl.tema_principal,
      autores: [], // Pode adicionar lógica para buscar autores
      urlCamara: pl.url_fonte || '',
    });

    if (result) {
      res.json({
        success: true,
        message: 'Tweet publicado com sucesso',
        data: {
          tweetId: result.data.id,
          text: result.data.text,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao publicar tweet',
      });
    }
  } catch (error) {
    console.error('❌ Erro ao publicar tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao publicar tweet',
    });
  }
});

/**
 * POST /api/twitter/tweet/lacuna/:tema
 * Publica tweet sobre lacuna legislativa de um tema
 */
router.post('/tweet/lacuna/:tema', async (req: Request, res: Response) => {
  try {
    const { tema } = req.params;

    // Busca métricas de lacuna do tema
    const metrica = await prisma.metricaLacuna.findFirst({
      where: {
        tipo_agregacao: 'tema',
        chave: tema,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!metrica) {
      res.status(404).json({
        success: false,
        error: 'Métrica de lacuna não encontrada para este tema',
      });
      return;
    }

    // Publica no Twitter
    const result = await twitterService.tweetHighLacuna(
      tema,
      metrica.percentual_lacuna,
      metrica.demandas_cidadaos,
      metrica.pls_tramitacao
    );

    if (result) {
      res.json({
        success: true,
        message: 'Tweet sobre lacuna publicado com sucesso',
        data: {
          tweetId: result.data.id,
          text: result.data.text,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao publicar tweet',
      });
    }
  } catch (error) {
    console.error('❌ Erro ao publicar tweet de lacuna:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao publicar tweet',
    });
  }
});

/**
 * POST /api/twitter/tweet/weekly-summary
 * Publica resumo semanal
 */
router.post('/tweet/weekly-summary', async (req: Request, res: Response) => {
  try {
    // Calcula estatísticas
    const totalProposals = await prisma.propostaPauta.count();
    const totalPLs = await prisma.projetoLei.count();
    const totalCitizens = await prisma.cidadao.count();

    // Busca tema com maior lacuna
    const topLacuna = await prisma.metricaLacuna.findFirst({
      where: {
        tipo_agregacao: 'tema',
      },
      orderBy: {
        percentual_lacuna: 'desc',
      },
    });

    if (!topLacuna) {
      res.status(404).json({
        success: false,
        error: 'Nenhuma métrica de lacuna encontrada',
      });
      return;
    }

    // Publica no Twitter
    const result = await twitterService.tweetWeeklySummary({
      totalProposals,
      totalPLs,
      topTheme: topLacuna.chave,
      topLacuna: topLacuna.percentual_lacuna,
      totalCitizens,
    });

    if (result) {
      res.json({
        success: true,
        message: 'Resumo semanal publicado com sucesso',
        data: {
          tweetId: result.data.id,
          text: result.data.text,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao publicar resumo',
      });
    }
  } catch (error) {
    console.error('❌ Erro ao publicar resumo semanal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao publicar resumo',
    });
  }
});

export default router;
