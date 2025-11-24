/**
 * Exemplo de uso do serviço Twitter
 * Execute com: tsx src/examples/twitter-examples.ts
 */

import { PrismaClient } from '@prisma/client';
import twitterService from '../services/twitter.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🐦 Testando integração com Twitter\n');

  // 1. Verificar status
  console.log('1️⃣ Verificando status da conexão...');
  const isEnabled = twitterService.isEnabled();
  console.log(`   Twitter habilitado: ${isEnabled}`);

  if (isEnabled) {
    const isConnected = await twitterService.testConnection();
    console.log(`   Conexão bem-sucedida: ${isConnected}\n`);
  } else {
    console.log('   ⚠️ Configure as variáveis de ambiente para habilitar Twitter\n');
    console.log('   TWITTER_API_KEY');
    console.log('   TWITTER_API_SECRET');
    console.log('   TWITTER_ACCESS_TOKEN');
    console.log('   TWITTER_ACCESS_TOKEN_SECRET\n');
    return;
  }

  // 2. Buscar um PL para testar
  console.log('2️⃣ Buscando PL para exemplo...');
  const pl = await prisma.projetoLei.findFirst({
    orderBy: { created_at: 'desc' },
  });

  if (pl) {
    console.log(`   PL encontrado: ${pl.pl_id} - ${pl.titulo}\n`);

    // 3. Publicar tweet sobre o PL (descomente para testar)
    console.log('3️⃣ Exemplo de tweet que seria publicado:');
    console.log('   (Descomente o código abaixo para publicar de verdade)\n');

    /*
    const result = await twitterService.tweetNewPL({
      numero: pl.pl_id,
      titulo: pl.titulo,
      resumo: pl.resumo || '',
      tema: pl.tema_principal,
      autores: [],
      urlCamara: pl.url_fonte || '',
    });

    if (result) {
      console.log('   ✅ Tweet publicado!');
      console.log(`   ID: ${result.data.id}`);
      console.log(`   Texto: ${result.data.text}`);
    }
    */

    console.log(`   📝 Prévia do tweet:`);
    console.log(`   🏛️ Novo PL em Análise!`);
    console.log(`   `);
    console.log(`   ${pl.pl_id}: ${pl.titulo.substring(0, 80)}...`);
    console.log(`   `);
    console.log(`   #VozLocal #Legislativo #${pl.tema_principal.replace(/\s/g, '')}`);
  } else {
    console.log('   ⚠️ Nenhum PL encontrado no banco\n');
  }

  // 4. Buscar métrica de lacuna para exemplo
  console.log('\n4️⃣ Buscando métrica de lacuna para exemplo...');
  const metrica = await prisma.metricaLacuna.findFirst({
    where: {
      tipo_agregacao: 'tema',
      percentual_lacuna: { gte: 70 },
    },
    orderBy: { percentual_lacuna: 'desc' },
  });

  if (metrica) {
    console.log(`   Lacuna encontrada: ${metrica.chave} - ${metrica.percentual_lacuna}%\n`);

    console.log('5️⃣ Exemplo de tweet de lacuna que seria publicado:');
    console.log('   (Descomente o código abaixo para publicar de verdade)\n');

    /*
    const result = await twitterService.tweetHighLacuna(
      metrica.chave,
      metrica.percentual_lacuna,
      metrica.demandas_cidadaos,
      metrica.pls_tramitacao
    );

    if (result) {
      console.log('   ✅ Tweet publicado!');
      console.log(`   ID: ${result.data.id}`);
    }
    */

    console.log(`   📝 Prévia do tweet:`);
    console.log(`   ⚠️ Alerta de Lacuna Legislativa!`);
    console.log(`   `);
    console.log(`   Tema: ${metrica.chave}`);
    console.log(`   Lacuna: ${metrica.percentual_lacuna.toFixed(1)}%`);
    console.log(`   `);
    console.log(`   📊 ${metrica.demandas_cidadaos} demandas cidadãs`);
    console.log(`   📜 ${metrica.pls_tramitacao} PLs em tramitação`);
  } else {
    console.log('   ℹ️ Nenhuma lacuna alta encontrada\n');
  }

  // 6. Exemplo de resumo semanal
  console.log('\n6️⃣ Exemplo de resumo semanal que seria publicado:');
  console.log('   (Descomente o código abaixo para publicar de verdade)\n');

  const totalProposals = await prisma.propostaPauta.count();
  const totalPLs = await prisma.projetoLei.count();
  const totalCitizens = await prisma.cidadao.count();

  const topLacuna = await prisma.metricaLacuna.findFirst({
    where: { tipo_agregacao: 'tema' },
    orderBy: { percentual_lacuna: 'desc' },
  });

  if (topLacuna) {
    /*
    const result = await twitterService.tweetWeeklySummary({
      totalProposals,
      totalPLs,
      topTheme: topLacuna.chave,
      topLacuna: topLacuna.percentual_lacuna,
      totalCitizens,
    });

    if (result) {
      console.log('   ✅ Tweet publicado!');
      console.log(`   ID: ${result.data.id}`);
    }
    */

    console.log(`   📝 Prévia do tweet:`);
    console.log(`   📊 Resumo Semanal - Voz.Local`);
    console.log(`   `);
    console.log(`   👥 ${totalCitizens} cidadãos engajados`);
    console.log(`   💬 ${totalProposals} propostas recebidas`);
    console.log(`   📜 ${totalPLs} PLs monitorados`);
    console.log(`   `);
    console.log(`   🔥 Tema mais demandado: ${topLacuna.chave}`);
    console.log(`   ⚠️ Maior lacuna: ${topLacuna.percentual_lacuna.toFixed(1)}%`);
  }

  console.log('\n✅ Exemplos concluídos!\n');
  console.log('💡 Para publicar tweets de verdade, descomente os blocos marcados no código.\n');
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
