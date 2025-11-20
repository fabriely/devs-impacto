import { Router } from 'express';
import WhatsAppBotController from '../controllers/WhatsAppBotController';

const WhatsAppBotRoutes = Router();

// Webhook para receber mensagens do Evolution API
WhatsAppBotRoutes.post('/webhook', (req, res) => 
  WhatsAppBotController.handleWebhook(req, res),
);

// Endpoints de teste
WhatsAppBotRoutes.post('/test/send-message', (req, res) =>
  WhatsAppBotController.sendTestMessage(req, res),
);

WhatsAppBotRoutes.post('/test/send-pl', (req, res) =>
  WhatsAppBotController.sendTestPL(req, res),
);

export default WhatsAppBotRoutes;
