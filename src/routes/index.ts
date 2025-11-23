import { Router } from 'express';

import BaileysWhatsAppRoutes from './BaileysWhatsAppRoutes';
import MetricsRoutes from './MetricsRoutes';
import ClassifierRoutes from './ClassifierRoutes';
import ProcessorRoutes from './ProcessorRoutes';

const router = Router();

// Rotas do WhatsApp Bot (Baileys direto - novo)
router.use('/api/baileys/', BaileysWhatsAppRoutes);

// Rotas do Voz.Local Pipeline
router.use('/api/metrics', MetricsRoutes);
router.use('/api/classifier', ClassifierRoutes);
router.use('/api/processor', ProcessorRoutes);

router.route('/').get((_, res) => {
  res.status(200).send('welcome to backend node - Voz.Local Pipeline');
});

export default router;
