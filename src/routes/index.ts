import { Router } from 'express';

import BaileysWhatsAppRoutes from './BaileysWhatsAppRoutes';

const router = Router();

// Rotas do WhatsApp Bot (Baileys direto - novo)
router.use('/api/baileys/', BaileysWhatsAppRoutes);

router.route('/').get((_, res) => {
  res.status(200).send('welcome to backend node ');
});

export default router;
