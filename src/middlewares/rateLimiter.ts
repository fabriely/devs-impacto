/**
 * Rate Limiting Middleware for Voz.Local APIs.
 * 
 * Protects endpoints from abuse by limiting the number of requests
 * per IP address within a time window.
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter - 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for AI/OpenAI endpoints - 10 requests per minute.
 * Used for expensive operations like classification and embedding generation.
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    success: false,
    error: 'Too many AI requests. Please try again in 1 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

/**
 * Moderate rate limiter for data endpoints - 50 requests per 5 minutes.
 * Used for data-intensive queries like proposals and metrics.
 */
export const dataLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 requests per 5 minutes
  message: {
    success: false,
    error: 'Too many data requests. Please slow down and try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for webhooks - 1000 requests per hour.
 * Webhooks from trusted sources may have higher limits.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 requests per hour
  message: {
    success: false,
    error: 'Webhook rate limit exceeded. Please contact support.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for requests from trusted webhook IPs
    const trustedIps = (process.env.TRUSTED_WEBHOOK_IPS || '').split(',');
    const clientIp = req.ip || '';
    return trustedIps.includes(clientIp);
  },
});

/**
 * Auth rate limiter - 5 attempts per 15 minutes.
 * Protects login/authentication endpoints from brute force.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

export default {
  generalLimiter,
  aiLimiter,
  dataLimiter,
  webhookLimiter,
  authLimiter,
};
