import 'dotenv/config';

import './env';
import app from './app';
import '@database';
import whatsappService from './services/whatsapp.service';
import cronService from './services/cron.service';

// Inicia o servidor HTTP
app.listen(process.env.SERVER_PORT || 3001, async () => {
  console.log(`🚀 Server ready at http://localhost:${process.env.SERVER_PORT || 3001}`);
  
  // Inicia o serviço do WhatsApp
  try {
    console.log('\n📱 Iniciando serviço WhatsApp...');
    await whatsappService.start();
  } catch (error) {
    console.error('❌ Erro ao iniciar WhatsApp:', error);
  }

  // Inicia os jobs agendados
  try {
    console.log('\n⏰ Iniciando serviço de agendamento...');
    cronService.initialize();
  } catch (error) {
    console.error('❌ Erro ao iniciar cron service:', error);
  }
});
