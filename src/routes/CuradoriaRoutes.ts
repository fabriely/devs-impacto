/**
 * Rotas para curadoria de PLs
 */

import { Router } from 'express';
import plCurationController from '../controllers/PLCurationController';

const router = Router();

// Rotas de curadoria de PLs
router.get('/curated', (req, res) => plCurationController.getCuratedPLs(req, res));
router.get('/trending', (req, res) => plCurationController.getTrendingPLs(req, res));
router.get('/urgent', (req, res) => plCurationController.getUrgentPLs(req, res));
router.get('/by-area/:area', (req, res) => plCurationController.getPLsByArea(req, res));
router.get('/:id', (req, res) => plCurationController.getPLById(req, res));

// Rotas de cron (admin)
router.post('/cron/run-curation', (req, res) => plCurationController.runCurationManually(req, res));
router.get('/cron/status', (req, res) => plCurationController.getCronStatus(req, res));

export default router;
