/**
 * Health Check Routes for Voz.Local Pipeline.
 * 
 * Provides system health status and diagnostics.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getRedisCache } from '../services/redis-cache.service';

const router = Router();
const prisma = new PrismaClient();
const cache = getRedisCache();

/**
 * GET /api/health
 * Basic health check - returns 200 if server is running
 */
router.get('/', async (req: Request, res: Response) => res.status(200).json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

/**
 * GET /api/health/detailed
 * Detailed health check including all dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: { status: 'up', message: 'API is running' },
      database: { status: 'unknown', message: '' },
      redis: { status: 'unknown', message: '', stats: {} },
    },
  };

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'up',
      message: 'PostgreSQL is connected and responsive',
    };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check Redis
  try {
    const isHealthy = await cache.healthCheck();
    const stats = await cache.getStats();

    if (isHealthy) {
      health.services.redis = {
        status: 'up',
        message: 'Redis is connected and responsive',
        stats: {
          connected: stats.connected,
          keys: stats.dbSize,
          memory: stats.memoryUsage,
          uptime: stats.uptime,
        },
      };
    } else {
      health.status = 'degraded';
      health.services.redis = {
        status: 'down',
        message: 'Redis is not responding',
        stats: {},
      };
    }
  } catch (error) {
    health.status = 'degraded';
    health.services.redis = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown Redis error',
      stats: {},
    };
  }

  const httpStatus = health.status === 'healthy' ? 200 : 503;
  return res.status(httpStatus).json(health);
});

/**
 * GET /api/health/redis
 * Redis-specific health check and stats
 */
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const isHealthy = await cache.healthCheck();
    const stats = await cache.getStats();

    if (!isHealthy) {
      return res.status(503).json({
        status: 'down',
        message: 'Redis is not responding',
        stats: {},
      });
    }

    return res.status(200).json({
      status: 'up',
      message: 'Redis is healthy',
      stats: {
        connected: stats.connected,
        totalKeys: stats.dbSize,
        memoryUsage: stats.memoryUsage,
        uptimeSeconds: stats.uptime,
        uptimeHuman: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`,
      },
    });
  } catch (error) {
    return res.status(503).json({
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      stats: {},
    });
  }
});

/**
 * POST /api/health/redis/flush
 * Clear all Redis cache (admin only - add auth in production!)
 */
router.post('/redis/flush', async (req: Request, res: Response) => {
  try {
    const deletedKeys = await cache.deletePattern('*');
    
    return res.status(200).json({
      success: true,
      message: `Cleared ${deletedKeys} keys from Redis cache`,
      deletedKeys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to flush cache',
    });
  }
});

/**
 * DELETE /api/health/redis/metrics
 * Invalidate all metrics cache
 */
router.delete('/redis/metrics', async (req: Request, res: Response) => {
  try {
    const deletedKeys = await cache.invalidateMetrics();
    
    return res.status(200).json({
      success: true,
      message: `Invalidated ${deletedKeys} metrics cache keys`,
      deletedKeys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to invalidate metrics cache',
    });
  }
});

/**
 * DELETE /api/health/redis/proposals
 * Invalidate all proposals cache
 */
router.delete('/redis/proposals', async (req: Request, res: Response) => {
  try {
    const deletedKeys = await cache.invalidateProposals();
    
    return res.status(200).json({
      success: true,
      message: `Invalidated ${deletedKeys} proposals cache keys`,
      deletedKeys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to invalidate proposals cache',
    });
  }
});

export default router;
