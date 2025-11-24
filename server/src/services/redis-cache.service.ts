/**
 * Redis Cache Service for Voz.Local Pipeline.
 * 
 * Provides caching layer for expensive operations like metrics calculation.
 * Reduces database load and improves API response times.
 */

import Redis from 'ioredis';

export class RedisCacheService {
  private client: Redis;

  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Get value from cache.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, skipping cache read');
        return null;
      }

      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting key ${key} from cache:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, skipping cache write');
        return false;
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`Error setting key ${key} in cache:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache.
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key} from cache:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern.
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Error deleting pattern ${pattern} from cache:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache.
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern: Get from cache, or compute and cache if not found.
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      console.log(`✅ Cache hit: ${key}`);
      return cached;
    }

    console.log(`❌ Cache miss: ${key}`);
    
    // Compute the value
    const computed = await computeFn();
    
    // Store in cache for next time
    await this.set(key, computed, ttlSeconds);
    
    return computed;
  }

  /**
   * Invalidate all metrics cache.
   */
  async invalidateMetrics(): Promise<number> {
    console.log('🗑️ Invalidating all metrics cache...');
    return this.deletePattern('metrics:*');
  }

  /**
   * Invalidate proposals cache.
   */
  async invalidateProposals(): Promise<number> {
    console.log('🗑️ Invalidating proposals cache...');
    return this.deletePattern('proposals:*');
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<{
    connected: boolean;
    dbSize: number;
    memoryUsage: string;
    uptime: number;
  }> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          dbSize: 0,
          memoryUsage: '0B',
          uptime: 0,
        };
      }

      const info = await this.client.info('server');
      const dbSize = await this.client.dbsize();
      const memoryInfo = await this.client.info('memory');

      // Parse uptime from info
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1], 10) : 0;

      // Parse memory usage
      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B';

      return {
        connected: this.isConnected,
        dbSize,
        memoryUsage,
        uptime,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        connected: false,
        dbSize: 0,
        memoryUsage: '0B',
        uptime: 0,
      };
    }
  }

  /**
   * Close Redis connection.
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      console.log('👋 Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: RedisCacheService | null = null;

/**
 * Get Redis cache service singleton.
 */
export function getRedisCache(): RedisCacheService {
  if (!cacheInstance) {
    cacheInstance = new RedisCacheService();
  }
  return cacheInstance;
}

/**
 * Generate cache key for metrics.
 */
export function generateMetricsCacheKey(
  type: string,
  params: Record<string, unknown>,
): string {
  const entries = Object.entries(params);
  const sortedParams = entries
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
  
  return `metrics:${type}:${sortedParams}`;
}

/**
 * Generate cache key for proposals.
 */
export function generateProposalsCacheKey(
  endpoint: string,
  params: Record<string, unknown>,
): string {
  const entries = Object.entries(params);
  const sortedParams = entries
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
  
  return `proposals:${endpoint}:${sortedParams}`;
}

export default RedisCacheService;
