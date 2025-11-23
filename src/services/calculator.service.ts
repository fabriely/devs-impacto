/**
 * Metrics Calculator Service for Voz.Local Pipeline.
 * 
 * Calculates the Legislative Gap Metric (Métrica de Lacuna Legislativa)
 * by comparing citizen demands vs. legislative bills in tramitação.
 * 
 * Migrated from Python to TypeScript.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LacunaMetric {
  tema?: string;
  grupo?: string;
  cidade?: string;
  demandasCidadaos: number;
  plsTramitacao: number;
  percentualLacuna: number;
  classificacao: 'Alta Lacuna' | 'Média Lacuna' | 'Baixa Lacuna';
}

export class MetricsCalculator {
  /**
   * Classify lacuna percentage into categories.
   */
  private classifyLacuna(percentual: number): 'Alta Lacuna' | 'Média Lacuna' | 'Baixa Lacuna' {
    if (percentual >= 70) {
      return 'Alta Lacuna';
    }
    if (percentual >= 40) {
      return 'Média Lacuna';
    }
    return 'Baixa Lacuna';
  }

  /**
   * Calculate legislative gap by theme.
   * 
   * Formula: Lacuna = (demandas_cidadaos - pls_tramitacao) / demandas_cidadaos * 100
   */
  async calculateLacunaByTheme(): Promise<LacunaMetric[]> {
    try {
      // Count citizen demands by theme (assuming PropostaPauta model exists in Prisma)
      const demandas = await prisma.$queryRaw<Array<{ tema_principal: string; count: bigint }>>`
        SELECT tema_principal, COUNT(*) as count
        FROM propostas_pauta
        WHERE tema_principal IS NOT NULL
        GROUP BY tema_principal
      `;

      // Count PLs in tramitação by theme
      const pls = await prisma.$queryRaw<Array<{ tema_principal: string; count: bigint }>>`
        SELECT tema_principal, COUNT(*) as count
        FROM projetos_lei
        WHERE status = 'tramitacao' AND tema_principal IS NOT NULL
        GROUP BY tema_principal
      `;

      // Create lookup map for PLs
      const plsMap = new Map<string, number>();
      pls.forEach((pl) => {
        plsMap.set(pl.tema_principal, Number(pl.count));
      });

      // Calculate lacuna for each theme
      const results: LacunaMetric[] = demandas.map(({ tema_principal: tema, count }) => {
        const demandasCount = Number(count);
        const plsCount = plsMap.get(tema) || 0;

        // Calculate lacuna percentage
        let lacuna = 0;
        if (demandasCount > 0) {
          lacuna = ((demandasCount - plsCount) / demandasCount) * 100;
          lacuna = Math.max(0, lacuna); // Ensure non-negative
        }

        return {
          tema,
          demandasCidadaos: demandasCount,
          plsTramitacao: plsCount,
          percentualLacuna: Number(lacuna.toFixed(2)),
          classificacao: this.classifyLacuna(lacuna),
        };
      });

      return results.sort((a, b) => b.percentualLacuna - a.percentualLacuna);
    } catch (error) {
      console.error('Error calculating lacuna by theme:', error);
      throw new Error('Failed to calculate lacuna by theme');
    }
  }

  /**
   * Calculate legislative gap by inclusion group (Mulheres, PCDs, LGBTQIA+, etc.)
   */
  async calculateLacunaByGroup(): Promise<LacunaMetric[]> {
    try {
      // Count citizen demands by group
      const demandas = await prisma.$queryRaw<Array<{ grupo_inclusao: string; count: bigint }>>`
        SELECT grupo_inclusao, COUNT(*) as count
        FROM propostas_pauta
        WHERE grupo_inclusao IS NOT NULL
        GROUP BY grupo_inclusao
      `;

      // Get PLs count (we'll need to match by metadata or other logic)
      // For now, using a simplified approach
      const totalPls = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM projetos_lei
        WHERE status = 'tramitacao'
      `;

      const totalPlsCount = Number(totalPls[0]?.count || 0);

      const results: LacunaMetric[] = demandas.map(({ grupo_inclusao: grupo, count }) => {
        const demandasCount = Number(count);
        // Simplified: distribute PLs proportionally (this can be improved)
        const plsCount = Math.floor(totalPlsCount / demandas.length);

        let lacuna = 0;
        if (demandasCount > 0) {
          lacuna = ((demandasCount - plsCount) / demandasCount) * 100;
          lacuna = Math.max(0, lacuna);
        }

        return {
          grupo,
          demandasCidadaos: demandasCount,
          plsTramitacao: plsCount,
          percentualLacuna: Number(lacuna.toFixed(2)),
          classificacao: this.classifyLacuna(lacuna),
        };
      });

      return results.sort((a, b) => b.percentualLacuna - a.percentualLacuna);
    } catch (error) {
      console.error('Error calculating lacuna by group:', error);
      throw new Error('Failed to calculate lacuna by group');
    }
  }

  /**
   * Calculate legislative gap by city.
   */
  async calculateLacunaByCidade(): Promise<LacunaMetric[]> {
    try {
      // Count citizen demands by city
      const demandas = await prisma.$queryRaw<Array<{ cidade: string; count: bigint }>>`
        SELECT cidade, COUNT(*) as count
        FROM propostas_pauta
        WHERE cidade IS NOT NULL
        GROUP BY cidade
      `;

      // Count PLs by city
      const pls = await prisma.$queryRaw<Array<{ cidade: string; count: bigint }>>`
        SELECT cidade, COUNT(*) as count
        FROM projetos_lei
        WHERE status = 'tramitacao' AND cidade IS NOT NULL
        GROUP BY cidade
      `;

      const plsMap = new Map<string, number>();
      pls.forEach((pl) => {
        plsMap.set(pl.cidade, Number(pl.count));
      });

      const results: LacunaMetric[] = demandas.map(({ cidade, count }) => {
        const demandasCount = Number(count);
        const plsCount = plsMap.get(cidade) || 0;

        let lacuna = 0;
        if (demandasCount > 0) {
          lacuna = ((demandasCount - plsCount) / demandasCount) * 100;
          lacuna = Math.max(0, lacuna);
        }

        return {
          cidade,
          demandasCidadaos: demandasCount,
          plsTramitacao: plsCount,
          percentualLacuna: Number(lacuna.toFixed(2)),
          classificacao: this.classifyLacuna(lacuna),
        };
      });

      return results.sort((a, b) => b.percentualLacuna - a.percentualLacuna);
    } catch (error) {
      console.error('Error calculating lacuna by cidade:', error);
      throw new Error('Failed to calculate lacuna by cidade');
    }
  }

  /**
   * Get overall summary statistics.
   */
  async getSummaryStats(): Promise<{
    totalDemandas: number;
    totalPlsTramitacao: number;
    percentualLacunaGeral: number;
    totalCidadaos: number;
    totalCidades: number;
  }> {
    try {
      const [demandasResult, plsResult, cidadaosResult, cidadesResult] = await Promise.all([
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM propostas_pauta`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM projetos_lei WHERE status = 'tramitacao'`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM cidadaos`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT cidade) as count FROM propostas_pauta WHERE cidade IS NOT NULL`,
      ]);

      const totalDemandas = Number(demandasResult[0]?.count || 0);
      const totalPlsTramitacao = Number(plsResult[0]?.count || 0);
      const totalCidadaos = Number(cidadaosResult[0]?.count || 0);
      const totalCidades = Number(cidadesResult[0]?.count || 0);

      let percentualLacunaGeral = 0;
      if (totalDemandas > 0) {
        percentualLacunaGeral = ((totalDemandas - totalPlsTramitacao) / totalDemandas) * 100;
        percentualLacunaGeral = Math.max(0, percentualLacunaGeral);
      }

      return {
        totalDemandas,
        totalPlsTramitacao,
        percentualLacunaGeral: Number(percentualLacunaGeral.toFixed(2)),
        totalCidadaos,
        totalCidades,
      };
    } catch (error) {
      console.error('Error getting summary stats:', error);
      throw new Error('Failed to get summary statistics');
    }
  }
}

export default MetricsCalculator;
