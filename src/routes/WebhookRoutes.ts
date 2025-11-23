/**
 * Webhook Routes for Voz.Local Pipeline.
 * 
 * Receives legislative bills (PLs) from external sources like API da Câmara.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import twitterService from '../services/twitter.service';

const router = Router();
const prisma = new PrismaClient();

// Webhook secret for validating requests (set in environment)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';

/**
 * Validate webhook signature to ensure request authenticity.
 */
function validateWebhookSignature(req: Request): boolean {
  const signature = req.headers['x-webhook-signature'] as string;
  
  if (!signature) {
    return false;
  }

  // Calculate expected signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Compare signatures (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signature) as unknown as Uint8Array,
    Buffer.from(expectedSignature) as unknown as Uint8Array,
  );
}

/**
 * Interface for PL data from API da Câmara.
 */
interface CamaraPLData {
  id: string;
  numero?: string;
  ano?: string;
  ementa?: string;
  ementaDetalhada?: string;
  keywords?: string;
  uriAutores?: string;
  statusProposicao?: {
    descricaoTramitacao?: string;
    siglaOrgao?: string;
  };
  temas?: string[];
  urlInteiroTeor?: string;
  dataApresentacao?: string;
}

/**
 * POST /api/webhooks/camara-pls
 * Receive new PLs from API da Câmara
 */
router.post('/camara-pls', async (req: Request, res: Response) => {
  try {
    // Validate webhook signature
    if (!validateWebhookSignature(req)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const plData: CamaraPLData = req.body;

    // Validate required fields
    if (!plData.id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    // Build PL identifier
    const plId = plData.numero && plData.ano 
      ? `PL-${plData.numero}/${plData.ano}`
      : plData.id;

    // Extract title and summary
    const titulo = plData.ementa || plData.ementaDetalhada || 'Sem título';
    const resumo = plData.ementaDetalhada || plData.ementa || null;

    // Determine main theme (use first theme or extract from keywords)
    let temaPrincipal = 'outros';
    let temasSecundarios: string[] = [];

    if (plData.temas && plData.temas.length > 0) {
      temaPrincipal = plData.temas[0].toLowerCase();
      temasSecundarios = plData.temas.slice(1).map(t => t.toLowerCase());
    } else if (plData.keywords) {
      // Extract themes from keywords
      const keywords = plData.keywords.toLowerCase().split(',').map(k => k.trim());
      if (keywords.length > 0) {
        [temaPrincipal, ...temasSecundarios] = keywords;
      }
    }

    // Extract status
    const status = plData.statusProposicao?.descricaoTramitacao || 'Em tramitação';

    // Build URL
    const urlFonte = plData.urlInteiroTeor || 
      `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${plData.id}`;

    // Check if PL already exists
    const existing = await prisma.projetoLei.findUnique({
      where: { pl_id: plId },
    });

    if (existing) {
      // Update existing PL
      const updated = await prisma.projetoLei.update({
        where: { pl_id: plId },
        data: {
          titulo: titulo.substring(0, 500),
          resumo,
          tema_principal: temaPrincipal.substring(0, 100),
          temas_secundarios: temasSecundarios.length > 0 
            ? JSON.stringify(temasSecundarios) 
            : null,
          status: status.substring(0, 50),
          url_fonte: urlFonte.substring(0, 500),
        },
      });

      console.log(`PL updated: ${plId} (ID: ${updated.id})`);

      return res.status(200).json({
        success: true,
        message: 'PL updated successfully',
        data: {
          id: updated.id,
          plId: updated.pl_id,
          updated: true,
        },
      });
    }

    // Create new PL
    const newPL = await prisma.projetoLei.create({
      data: {
        pl_id: plId,
        titulo: titulo.substring(0, 500),
        resumo,
        tema_principal: temaPrincipal.substring(0, 100),
        temas_secundarios: temasSecundarios.length > 0 
          ? JSON.stringify(temasSecundarios) 
          : null,
        status: status.substring(0, 50),
        url_fonte: urlFonte.substring(0, 500),
      },
    });

    console.log(`New PL created: ${plId} (ID: ${newPL.id})`);

    // Publica no Twitter sobre o novo PL
    if (twitterService.isEnabled()) {
      try {
        await twitterService.tweetNewPL({
          numero: plId,
          titulo: titulo.substring(0, 100),
          resumo: resumo?.substring(0, 200) || '',
          tema: temaPrincipal,
          autores: [], // Adicionar autores se disponível
          urlCamara: urlFonte,
        });
      } catch (twitterError) {
        console.error('Erro ao publicar no Twitter:', twitterError);
        // Não falha a requisição se o Twitter falhar
      }
    }

    return res.status(201).json({
      success: true,
      message: 'PL created successfully',
      data: {
        id: newPL.id,
        plId: newPL.pl_id,
        created: true,
      },
    });
  } catch (error) {
    console.error('Error processing PL webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process PL',
    });
  }
});

/**
 * POST /api/webhooks/camara-pls/batch
 * Receive multiple PLs in batch
 */
router.post('/camara-pls/batch', async (req: Request, res: Response) => {
  try {
    // Validate webhook signature
    if (!validateWebhookSignature(req)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const pls: CamaraPLData[] = req.body.pls || [];

    if (!Array.isArray(pls) || pls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch data: expected array of PLs',
      });
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each PL
    await Promise.allSettled(
      pls.map(async (plData) => {
        try {
          if (!plData.id) {
            errors += 1;
            return;
          }

          const plId = plData.numero && plData.ano 
            ? `PL-${plData.numero}/${plData.ano}`
            : plData.id;

          const titulo = plData.ementa || plData.ementaDetalhada || 'Sem título';
          const resumo = plData.ementaDetalhada || plData.ementa || null;

          let temaPrincipal = 'outros';
          let temasSecundarios: string[] = [];

          if (plData.temas && plData.temas.length > 0) {
            temaPrincipal = plData.temas[0].toLowerCase();
            temasSecundarios = plData.temas.slice(1).map(t => t.toLowerCase());
          } else if (plData.keywords) {
            const keywords = plData.keywords.toLowerCase().split(',').map(k => k.trim());
            if (keywords.length > 0) {
              [temaPrincipal, ...temasSecundarios] = keywords;
            }
          }

          const status = plData.statusProposicao?.descricaoTramitacao || 'Em tramitação';
          const urlFonte = plData.urlInteiroTeor || 
            `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${plData.id}`;

          // Upsert PL
          await prisma.projetoLei.upsert({
            where: { pl_id: plId },
            update: {
              titulo: titulo.substring(0, 500),
              resumo,
              tema_principal: temaPrincipal.substring(0, 100),
              temas_secundarios: temasSecundarios.length > 0 
                ? JSON.stringify(temasSecundarios) 
                : null,
              status: status.substring(0, 50),
              url_fonte: urlFonte.substring(0, 500),
            },
            create: {
              pl_id: plId,
              titulo: titulo.substring(0, 500),
              resumo,
              tema_principal: temaPrincipal.substring(0, 100),
              temas_secundarios: temasSecundarios.length > 0 
                ? JSON.stringify(temasSecundarios) 
                : null,
              status: status.substring(0, 50),
              url_fonte: urlFonte.substring(0, 500),
            },
          }).then((result) => {
            if (result.created_at.getTime() > Date.now() - 5000) {
              created += 1;
            } else {
              updated += 1;
            }
          });
        } catch (err) {
          console.error('Error processing PL in batch:', err);
          errors += 1;
        }
      }),
    );

    console.log(`Batch processed: ${created} created, ${updated} updated, ${errors} errors`);

    return res.status(200).json({
      success: true,
      message: 'Batch processed successfully',
      data: {
        total: pls.length,
        created,
        updated,
        errors,
      },
    });
  } catch (error) {
    console.error('Error processing batch webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process batch',
    });
  }
});

/**
 * GET /api/webhooks/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => 
  res.status(200).json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString(),
  }));

export default router;
