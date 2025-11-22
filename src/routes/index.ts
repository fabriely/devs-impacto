import { Router } from 'express';

import BaileysWhatsAppRoutes from './BaileysWhatsAppRoutes';
import PLCurationRoutes from './CuradoriaRoutes';

const router = Router();

// Rotas do WhatsApp Bot (Baileys direto - novo)
router.use('/api/baileys/', BaileysWhatsAppRoutes);

// Rotas de curadoria de PLs
router.use('/api/pls/', PLCurationRoutes);

router.route('/').get((_, res) => {
  res.status(200).send('welcome to backend node ');
});

export default router;
