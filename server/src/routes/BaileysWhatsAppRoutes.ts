/**
 * Rotas do WhatsApp Bot usando Baileys diretamente
 */

import { Router } from 'express';
import baileysWhatsAppController from '../controllers/BaileysWhatsAppController';

const router = Router();

/**
 * @route POST /api/baileys/send-message
 * @desc Envia mensagem de teste
 */
router.post('/send-message', (req, res) => baileysWhatsAppController.sendTestMessage(req, res));

/**
 * @route POST /api/baileys/send-pl
 * @desc Envia resumo de PL
 */
router.post('/send-pl', (req, res) => baileysWhatsAppController.sendTestPL(req, res));

/**
 * @route GET /api/baileys/qr
 * @desc Obtém QR Code para conexão
 */
router.get('/qr', (req, res) => baileysWhatsAppController.getQRCode(req, res));

/**
 * @route GET /api/baileys/status
 * @desc Verifica status da conexão
 */
router.get('/status', (req, res) => baileysWhatsAppController.getStatus(req, res));

export default router;
