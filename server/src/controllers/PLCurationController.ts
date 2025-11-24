/**
 * Controller para endpoints de curadoria de PLs
 */

import { Request, Response } from 'express';
import plCurationService from '../services/pl-curation.service';
import cronService from '../services/cron.service';

class PLCurationController {
  /**
   * GET /api/pls/curated
   * Retorna PLs curados com filtros opcionais
   */
  async getCuratedPLs(req: Request, res: Response): Promise<void> {
    try {
      const {
        minRelevanceScore,
        areas,
        urgency,
        onlyTrending,
        limit,
      } = req.query;

      const filters = {
        minRelevanceScore: minRelevanceScore ? Number(minRelevanceScore) : 60,
        areas: areas ? (areas as string).split(',') : undefined,
        urgencyLevels: urgency ? (urgency as string).split(',') as ('high' | 'medium' | 'low')[] : undefined,
        onlyTrending: onlyTrending === 'true',
        limit: limit ? Number(limit) : 10,
      };

      const curatedPLs = await plCurationService.curatePLsForWeek(filters);

      res.json({
        success: true,
        total: curatedPLs.length,
        data: curatedPLs,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar PLs curados:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar PLs curados',
      });
    }
  }

  /**
   * GET /api/pls/trending
   * Retorna PLs em destaque na mídia
   */
  async getTrendingPLs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const trendingPLs = await plCurationService.getTrendingPLs(limit);

      res.json({
        success: true,
        total: trendingPLs.length,
        data: trendingPLs,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar PLs em destaque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar PLs em destaque',
      });
    }
  }

  /**
   * GET /api/pls/urgent
   * Retorna PLs urgentes (alta prioridade)
   */
  async getUrgentPLs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const urgentPLs = await plCurationService.getUrgentPLs(limit);

      res.json({
        success: true,
        total: urgentPLs.length,
        data: urgentPLs,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar PLs urgentes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar PLs urgentes',
      });
    }
  }

  /**
   * GET /api/pls/by-area/:area
   * Retorna PLs filtrados por área de interesse
   */
  async getPLsByArea(req: Request, res: Response): Promise<void> {
    try {
      const { area } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 5;

      const pls = await plCurationService.getPLsByArea(area, limit);

      res.json({
        success: true,
        area,
        total: pls.length,
        data: pls,
      });
    } catch (error) {
      console.error(`❌ Erro ao buscar PLs da área ${req.params.area}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar PLs por área',
      });
    }
  }

  /**
   * GET /api/pls/:id
   * Retorna detalhes de um PL específico curado
   */
  async getPLById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      
      if (Number.isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido',
        });
        return;
      }

      const pl = await plCurationService.getCuratedPLById(id);

      if (!pl) {
        res.status(404).json({
          success: false,
          error: 'PL não encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: pl,
      });
    } catch (error) {
      console.error(`❌ Erro ao buscar PL ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar PL',
      });
    }
  }

  /**
   * POST /api/cron/run-curation
   * Executa a curadoria manualmente (para testes/admin)
   */
  async runCurationManually(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Executando curadoria manual via API...');
      
      await cronService.runCurationNow();

      res.json({
        success: true,
        message: 'Curadoria executada com sucesso',
      });
    } catch (error) {
      console.error('❌ Erro ao executar curadoria manual:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao executar curadoria',
      });
    }
  }

  /**
   * GET /api/cron/status
   * Retorna status dos jobs agendados
   */
  async getCronStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobs = cronService.listJobs();

      res.json({
        success: true,
        jobs,
        message: `${jobs.length} jobs agendados`,
      });
    } catch (error) {
      console.error('❌ Erro ao buscar status do cron:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar status',
      });
    }
  }
}

export default new PLCurationController();
