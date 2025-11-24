import { Router } from 'express';

import BaileysWhatsAppRoutes from './BaileysWhatsAppRoutes';
import MetricsRoutes from './MetricsRoutes';
import ClassifierRoutes from './ClassifierRoutes';
import ProcessorRoutes from './ProcessorRoutes';
import PLCurationRoutes from './CuradoriaRoutes';
import ProposalsRoutes from './ProposalsRoutes';
import WebhookRoutes from './WebhookRoutes';
import HealthRoutes from './HealthRoutes';
import TwitterRoutes from './TwitterRoutes';

const router = Router();

// Health check routes (no rate limiting)
router.use('/api/health', HealthRoutes);

// Rotas do WhatsApp Bot (Baileys direto - novo)
router.use('/api/baileys/', BaileysWhatsAppRoutes);

// Rotas do Voz.Local Pipeline (with rate limiting)
router.use('/api/metrics', MetricsRoutes);
router.use('/api/classifier', ClassifierRoutes);
router.use('/api/processor', ProcessorRoutes);
router.use('/api/proposals', ProposalsRoutes);

// Webhooks externos
router.use('/api/webhooks', WebhookRoutes);

// Rotas de curadoria de PLs
router.use('/api/pls/', PLCurationRoutes);

// Rotas de integração com Twitter
router.use('/api/twitter', TwitterRoutes);

router.route('/').get((_, res) => {
  res.status(200).send('welcome to backend node - Voz.Local Pipeline');
});

export default router;
