/**
 * Exemplos de uso do serviço de curadoria de PLs
 * Para executar: npx tsx src/examples/curation-examples.ts
 */

import 'dotenv/config';
import '../env';

import plCurationService from '../services/pl-curation.service';
import camaraAPIService from '../services/camara-api.service';
import plScraperService from '../services/pl-scraper.service';

async function main() {
  console.log('🎯 Exemplos de Curadoria de PLs\n');

  // ============================================
  // EXEMPLO 1: Buscar PLs curados da semana
  // ============================================
  console.log('📋 EXEMPLO 1: PLs curados da semana');
  console.log('─'.repeat(50));
  
  try {
    const curatedPLs = await plCurationService.curatePLsForWeek({
      minRelevanceScore: 60,
      limit: 5,
    });

    console.log(`✅ ${curatedPLs.length} PLs curados encontrados:\n`);

    curatedPLs.forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.numero}/${pl.ano} - Score: ${pl.relevanceScore}`);
      console.log(`   📝 ${pl.ementa.slice(0, 100)}...`);
      console.log(`   🎯 Áreas: ${pl.impact.areas.join(', ')}`);
      console.log(`   🔥 Trending: ${pl.isTrending ? 'Sim' : 'Não'}`);
      console.log(`   ⚡ Urgência: ${pl.impact.urgency}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 2: PLs em destaque na mídia
  // ============================================
  console.log('\n📰 EXEMPLO 2: PLs em destaque na mídia');
  console.log('─'.repeat(50));
  
  try {
    const trendingPLs = await plCurationService.getTrendingPLs(3);
    
    console.log(`✅ ${trendingPLs.length} PLs em destaque:\n`);

    trendingPLs.forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.numero}/${pl.ano}`);
      console.log(`   📰 Fontes: ${pl.trendingSources?.join(', ')}`);
      console.log(`   📝 ${pl.citizenSummary.slice(0, 150)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 3: PLs urgentes (alta prioridade)
  // ============================================
  console.log('\n🚨 EXEMPLO 3: PLs urgentes');
  console.log('─'.repeat(50));
  
  try {
    const urgentPLs = await plCurationService.getUrgentPLs(3);
    
    console.log(`✅ ${urgentPLs.length} PLs urgentes:\n`);

    urgentPLs.forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.numero}/${pl.ano}`);
      console.log(`   ⚡ Urgência: ${pl.impact.urgency}`);
      console.log(`   📅 Situação: ${pl.situacao}`);
      console.log(`   🗳️ Tem votação: ${pl.hasVotacao ? 'Sim' : 'Não'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 4: PLs por área (Saúde)
  // ============================================
  console.log('\n🏥 EXEMPLO 4: PLs da área de Saúde');
  console.log('─'.repeat(50));
  
  try {
    const healthPLs = await plCurationService.getPLsByArea('saúde', 3);
    
    console.log(`✅ ${healthPLs.length} PLs de saúde:\n`);

    healthPLs.forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.numero}/${pl.ano}`);
      console.log(`   📝 ${pl.citizenSummary.slice(0, 150)}...`);
      console.log(`   💯 Score: ${pl.relevanceScore}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 5: API direta da Câmara
  // ============================================
  console.log('\n🏛️ EXEMPLO 5: API direta da Câmara');
  console.log('─'.repeat(50));
  
  try {
    const { dados: recentPLs } = await camaraAPIService.fetchRecentPLs(5);
    
    console.log(`✅ ${recentPLs.length} PLs recentes da API:\n`);

    recentPLs.forEach((pl, index) => {
      console.log(`${index + 1}. ${pl.siglaTipo} ${pl.numero}/${pl.ano}`);
      console.log(`   📝 ${pl.ementa.slice(0, 100)}...`);
      console.log(`   🔗 ${pl.uri}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 6: Web Scraping de PLs em destaque
  // ============================================
  console.log('\n🕷️ EXEMPLO 6: Web Scraping');
  console.log('─'.repeat(50));
  
  try {
    const scrapedPLs = await plScraperService.scrapeTrendingPLs();
    
    console.log(`✅ ${scrapedPLs.length} PLs encontrados via scraping:\n`);

    scrapedPLs.slice(0, 5).forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.plNumber}`);
      console.log(`   📰 Fonte: ${pl.source}`);
      console.log(`   🔗 ${pl.link}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  // ============================================
  // EXEMPLO 7: Filtros personalizados
  // ============================================
  console.log('\n🎛️ EXEMPLO 7: Filtros personalizados');
  console.log('─'.repeat(50));
  
  try {
    const filteredPLs = await plCurationService.curatePLsForWeek({
      areas: ['saúde', 'educação'],
      urgencyLevels: ['high', 'medium'],
      minRelevanceScore: 70,
      onlyTrending: false,
      limit: 3,
    });
    
    console.log('Filtros aplicados:');
    console.log('  - Áreas: saúde, educação');
    console.log('  - Urgência: high, medium');
    console.log('  - Score mínimo: 70');
    console.log('  - Limite: 3\n');
    
    console.log(`✅ ${filteredPLs.length} PLs encontrados:\n`);

    filteredPLs.forEach((pl, index) => {
      console.log(`${index + 1}. PL ${pl.numero}/${pl.ano} - Score: ${pl.relevanceScore}`);
      console.log(`   🎯 Áreas: ${pl.impact.areas.join(', ')}`);
      console.log(`   ⚡ Urgência: ${pl.impact.urgency}`);
      console.log(`   📝 ${pl.citizenSummary.slice(0, 100)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  console.log('\n✅ Exemplos concluídos!');
}

// Executa os exemplos
main().catch(console.error);
