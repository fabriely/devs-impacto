/**
 * Exemplo simplificado de uso do serviço Twitter (sem banco de dados)
 * Execute com: tsx src/examples/twitter-examples-simple.ts
 */

import 'dotenv/config';
import twitterService from '../services/twitter.service';

async function main() {
  console.log('🐦 Testando integração com Twitter (versão simplificada)\n');

  // 1. Verificar status
  console.log('1️⃣ Verificando status da conexão...');
  const isEnabled = twitterService.isEnabled();
  console.log(`   Twitter habilitado: ${isEnabled}`);

  if (isEnabled) {
    const isConnected = await twitterService.testConnection();
    console.log(`   Conexão bem-sucedida: ${isConnected}\n`);

    if (!isConnected) {
      console.log('❌ Falha na conexão. Verifique suas credenciais no .env\n');
      return;
    }
  } else {
    console.log('   ⚠️ Configure as variáveis de ambiente para habilitar Twitter\n');
    console.log('   TWITTER_API_KEY');
    console.log('   TWITTER_API_SECRET');
    console.log('   TWITTER_ACCESS_TOKEN');
    console.log('   TWITTER_ACCESS_TOKEN_SECRET\n');
    return;
  }

  console.log('✅ Twitter está configurado e conectado!\n');

  // 2. Exemplo de tweet sobre PL (mock)
  console.log('2️⃣ Exemplo de tweet sobre PL:');
  console.log('   (Descomente o código abaixo para publicar de verdade)\n');


  console.log('   📝 Prévia do tweet que seria publicado:');
  console.log('   ────────────────────────────────────────');
  console.log('   🏥 Novo PL em Análise!');
  console.log('   ');
  console.log('   PL 1234/2024: Amplia atendimento do SUS em todo o...');
  console.log('   ');
  console.log('   Estabelece novas diretrizes para o atendimento prioritário...');
  console.log('   ');
  console.log('   👤 Dep. João Silva, Dep. Maria Santos');
  console.log('   #VozLocal #Legislativo #Saúde');
  console.log('   ────────────────────────────────────────\n');

  // 3. Exemplo de tweet sobre lacuna (mock)
  console.log('3️⃣ Exemplo de tweet sobre lacuna legislativa:');
  console.log('   (Descomente o código abaixo para publicar de verdade)\n');

  // Descomente para publicar um tweet de teste
  const lacunaResult = await twitterService.tweetHighLacuna(
    'Saúde',
    75.5,
    150,
    45
  );

  if (lacunaResult) {
    console.log('   ✅ Tweet publicado!');
    console.log(`   ID: ${lacunaResult.data.id}`);
    console.log(`   URL: https://twitter.com/user/status/${lacunaResult.data.id}`);
  }

  console.log('   📝 Prévia do tweet que seria publicado:');
  console.log('   ────────────────────────────────────────');
  console.log('   🏥 Alerta de Lacuna Legislativa!');
  console.log('   ');
  console.log('   Tema: Saúde');
  console.log('   Lacuna: 75.5%');
  console.log('   ');
  console.log('   📊 150 demandas cidadãs');
  console.log('   📜 45 PLs em tramitação');
  console.log('   ');
  console.log('   Os cidadãos pedem mais atenção do legislativo neste tema!');
  console.log('   ');
  console.log('   #VozLocal #LacunaLegislativa #Saúde');
  console.log('   ────────────────────────────────────────\n');

  // 4. Exemplo de resumo semanal (mock)
  console.log('4️⃣ Exemplo de resumo semanal:');
  console.log('   (Descomente o código abaixo para publicar de verdade)\n');

  // Descomente para publicar um tweet de teste
  const summaryResult = await twitterService.tweetWeeklySummary({
    totalProposals: 450,
    totalPLs: 180,
    topTheme: 'Saúde',
    topLacuna: 75.5,
    totalCitizens: 1250,
  });

  if (summaryResult) {
    console.log('   ✅ Tweet publicado!');
    console.log(`   ID: ${summaryResult.data.id}`);
  }

  console.log('   📝 Prévia do tweet que seria publicado:');
  console.log('   ────────────────────────────────────────');
  console.log('   📊 Resumo Semanal - Voz.Local');
  console.log('   ');
  console.log('   👥 1,250 cidadãos engajados');
  console.log('   💬 450 propostas recebidas');
  console.log('   📜 180 PLs monitorados');
  console.log('   ');
  console.log('   🔥 Tema mais demandado: Saúde');
  console.log('   ⚠️ Maior lacuna: 75.5%');
  console.log('   ');
  console.log('   Conectando cidadãos ao legislativo!');
  console.log('   ');
  console.log('   #VozLocal #Democracia #ParticipaçãoCidadã');
  console.log('   ────────────────────────────────────────\n');

  console.log('✅ Teste concluído com sucesso!\n');
  console.log('💡 Dicas:');
  console.log('   1. Para publicar tweets de verdade, descomente os blocos de código');
  console.log('   2. Execute dentro do Docker para ter acesso ao banco: docker exec -it devs-impacto-server npm run twitter:test');
  console.log('   3. Tweets automáticos acontecem quando novos PLs são adicionados via webhook\n');
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error);
    throw error;
  });
