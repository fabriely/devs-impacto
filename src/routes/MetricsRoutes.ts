/**
 * Metrics Routes for Voz.Local Pipeline.
 * 
 * Routes for calculating and retrieving legislative gap metrics.
 */

import { Router, Request, Response } from 'express';
import MetricsCalculator from '../services/calculator.service';
import { dataLimiter } from '../middlewares/rateLimiter';

const router = Router();
const metricsCalculator = new MetricsCalculator();

// Apply data rate limiter to all routes
router.use(dataLimiter);

/**
 * GET /api/metrics/lacuna/theme
 * Get legislative gap metrics by theme
 */
router.get('/lacuna/theme', async (req: Request, res: Response) => {
  try {
    const lacunas = await metricsCalculator.calculateLacunaByTheme();
    
    res.status(200).json({
      success: true,
      data: lacunas,
      count: lacunas.length,
    });
  } catch (error) {
    console.error('Error in GET /lacuna/theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate lacuna by theme',
    });
  }
});

/**
 * GET /api/metrics/lacuna/group
 * Get legislative gap metrics by inclusion group
 */
router.get('/lacuna/group', async (req: Request, res: Response) => {
  try {
    const lacunas = await metricsCalculator.calculateLacunaByGroup();
    
    res.status(200).json({
      success: true,
      data: lacunas,
      count: lacunas.length,
    });
  } catch (error) {
    console.error('Error in GET /lacuna/group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate lacuna by group',
    });
  }
});

/**
 * GET /api/metrics/lacuna/city
 * Get legislative gap metrics by city
 */
router.get('/lacuna/city', async (req: Request, res: Response) => {
  try {
    const lacunas = await metricsCalculator.calculateLacunaByCidade();
    
    res.status(200).json({
      success: true,
      data: lacunas,
      count: lacunas.length,
    });
  } catch (error) {
    console.error('Error in GET /lacuna/city:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate lacuna by city',
    });
  }
});

/**
 * GET /api/metrics/summary
 * Get overall summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await metricsCalculator.getSummaryStats();
    
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error in GET /summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summary statistics',
    });
  }
});

/**
 * GET /api/metrics/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Metrics service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
