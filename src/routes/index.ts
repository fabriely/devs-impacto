import { Router } from 'express';

import WhatsAppBotRoutes from './WhatsAppBotRoutes';

const router = Router();

router.use('/whatsapp', WhatsAppBotRoutes);
router.route('/').get((_, res) => {
  res.status(200).send('welcome to backend node ');
});

export default router;
