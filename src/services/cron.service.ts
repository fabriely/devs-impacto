/**
 * Serviço de agendamento de jobs (cron)
 * Responsável por executar tarefas periódicas como curadoria de PLs
 */

import cron, { ScheduledTask } from 'node-cron';
import plCurationService from './pl-curation.service';

class CronService {
  private jobs: Map<string, ScheduledTask> = new Map();

  /**
   * Inicializa todos os jobs agendados
   */
  initialize(): void {
    console.log('⏰ Iniciando serviço de agendamento...');

    // Job diário: Curadoria de PLs às 6h da manhã
    this.scheduleDailyCuration();

    // Job semanal: Relatório de PLs toda segunda-feira às 8h
    this.scheduleWeeklyReport();

    console.log('✅ Jobs agendados com sucesso');
  }

  /**
   * Job diário: Curadoria de PLs
   * Executa todos os dias às 6:00 AM
   */
  private scheduleDailyCuration(): void {
    const job = cron.schedule(
      '0 6 * * *', // Cron: 6:00 AM todo dia
      async () => {
        console.log('🎯 [CRON] Iniciando curadoria diária de PLs...');
        
        try {
          const curatedPLs = await plCurationService.curatePLsForWeek({
            minRelevanceScore: 60,
            limit: 15,
          });

          console.log(`✅ [CRON] ${curatedPLs.length} PLs curados com sucesso`);
          
          // TODO: Salvar PLs curados no banco de dados
          // await prisma.curatedPL.createMany({ data: curatedPLs });
          
          // TODO: Enviar notificações para usuários segmentados
          // await notificationService.sendDailyDigest(curatedPLs);

        } catch (error) {
          console.error('❌ [CRON] Erro na curadoria diária:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    this.jobs.set('daily_curation', job);
    job.start();
    console.log('📅 Job de curadoria diária agendado para 6:00 AM');
  }

  /**
   * Job semanal: Relatório de PLs
   * Executa toda segunda-feira às 8:00 AM
   */
  private scheduleWeeklyReport(): void {
    const job = cron.schedule(
      '0 8 * * 1', // Cron: 8:00 AM toda segunda-feira
      async () => {
        console.log('📊 [CRON] Gerando relatório semanal...');
        
        try {
          const [trending, urgent] = await Promise.all([
            plCurationService.getTrendingPLs(10),
            plCurationService.getUrgentPLs(5),
          ]);

          console.log(`✅ [CRON] Relatório semanal gerado:`);
          console.log(`  - ${trending.length} PLs em destaque`);
          console.log(`  - ${urgent.length} PLs urgentes`);

          // TODO: Enviar relatório semanal para usuários
          // await notificationService.sendWeeklyReport({ trending, urgent });

        } catch (error) {
          console.error('❌ [CRON] Erro no relatório semanal:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    this.jobs.set('weekly_report', job);
    job.start();
    console.log('📅 Job de relatório semanal agendado para segunda-feira às 8:00 AM');
  }

  /**
   * Executa a curadoria manualmente (útil para testes)
   */
  async runCurationNow(): Promise<void> {
    console.log('🔄 Executando curadoria manual...');
    
    try {
      const curatedPLs = await plCurationService.curatePLsForWeek({
        minRelevanceScore: 60,
        limit: 15,
      });

      console.log(`✅ Curadoria manual concluída: ${curatedPLs.length} PLs`);
      
      return curatedPLs as any;
    } catch (error) {
      console.error('❌ Erro na curadoria manual:', error);
      throw error;
    }
  }

  /**
   * Para um job específico
   */
  stopJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`⏸️ Job "${jobName}" pausado`);
    }
  }

  /**
   * Reinicia um job específico
   */
  startJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`▶️ Job "${jobName}" iniciado`);
    }
  }

  /**
   * Para todos os jobs
   */
  stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏸️ Job "${name}" pausado`);
    });
  }

  /**
   * Lista todos os jobs agendados
   */
  listJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

export default new CronService();
