/**
 * Web Scraper para detectar PLs em destaque na mídia
 * Fontes: Congresso em Foco, Poder360, etc
 */

import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

interface TrendingPL {
  plNumber: string; // Ex: "1234/2025"
  title: string;
  link: string;
  excerpt: string;
  source: string;
  scrapedAt: Date;
}

interface ScraperConfig {
  headless: boolean;
  timeout: number;
}

class PLScraperService {
  private browser: Browser | null = null;

  private config: ScraperConfig = {
    headless: true,
    timeout: 30000,
  };

  /**
   * Inicializa o browser
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Fecha o browser
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scraping do Congresso em Foco
   * URL: https://congressoemfoco.uol.com.br/area/congresso-nacional/
   */
  async scrapeCongressoEmFoco(): Promise<TrendingPL[]> {
    console.log('🔍 Iniciando scraping do Congresso em Foco...');
    
    try {
      const url = 'https://congressoemfoco.uol.com.br/area/congresso-nacional/';
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const trending: TrendingPL[] = [];

      // Seleciona artigos/posts
      $('article, .post, .noticia').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h1, h2, h3, .title, .post-title').first().text().trim();
        const link = $elem.find('a').first().attr('href') || '';
        const excerpt = $elem.find('p, .excerpt, .resumo').first().text().trim();

        if (!title) return;

        // Extrai número do PL do título (aceita variações)
        const plMatch = title.match(/\b(?:PL|PEC|PLP)\s*(?:n[º°])?\s*(\d+)[\s/]*(\d{4})\b/i);

        if (plMatch) {
          trending.push({
            plNumber: `${plMatch[1]}/${plMatch[2]}`,
            title,
            link: link.startsWith('http') ? link : `https://congressoemfoco.uol.com.br${link}`,
            excerpt: excerpt || title,
            source: 'Congresso em Foco',
            scrapedAt: new Date(),
          });
        }
      });

      console.log(`✅ ${trending.length} PLs encontrados no Congresso em Foco`);
      return trending;

    } catch (error) {
      console.error('❌ Erro ao fazer scraping do Congresso em Foco:', error);
      return [];
    }
  }

  /**
   * Scraping do Poder360
   * URL: https://www.poder360.com.br/congresso/
   */
  async scrapePoder360(): Promise<TrendingPL[]> {
    console.log('🔍 Iniciando scraping do Poder360...');
    
    try {
      const url = 'https://www.poder360.com.br/congresso/';
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const trending: TrendingPL[] = [];

      // Seleciona matérias
      $('article, .materia, .post').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h1, h2, h3, .titulo').first().text().trim();
        const link = $elem.find('a').first().attr('href') || '';
        const excerpt = $elem.find('p, .texto').first().text().trim();

        if (!title) return;

        // Extrai número do PL
        const plMatch = title.match(/\b(?:PL|PEC|PLP)\s*(?:n[º°])?\s*(\d+)[\s/]*(\d{4})\b/i);

        if (plMatch) {
          trending.push({
            plNumber: `${plMatch[1]}/${plMatch[2]}`,
            title,
            link: link.startsWith('http') ? link : `https://www.poder360.com.br${link}`,
            excerpt: excerpt || title,
            source: 'Poder360',
            scrapedAt: new Date(),
          });
        }
      });

      console.log(`✅ ${trending.length} PLs encontrados no Poder360`);
      return trending;

    } catch (error) {
      console.error('❌ Erro ao fazer scraping do Poder360:', error);
      return [];
    }
  }

  /**
   * Scraping de PLs em tramitação urgente na Câmara
   * URL: https://www.camara.leg.br/proposicoesWeb/prop_emtramitacao
   */
  async scrapeUrgentPLs(): Promise<TrendingPL[]> {
    console.log('🔍 Iniciando scraping de PLs urgentes da Câmara...');
    
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      );

      await page.goto('https://www.camara.leg.br/proposicoesWeb/prop_emtramitacao', {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });

      // Aguarda o carregamento da tabela
      await page.waitForSelector('table, .proposicao', { timeout: 5000 }).catch(() => {
        console.log('⚠️ Seletor de tabela não encontrado');
      });

      const html = await page.content();
      const $ = cheerio.load(html);

      const trending: TrendingPL[] = [];

      // Procura por PLs na página
      $('tr, .proposicao-item').each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text();

        // Busca padrão de PL no texto
        const plMatch = text.match(/\b(PL|PEC|PLP)\s*(\d+)\/(\d{4})\b/i);
        
        if (plMatch) {
          const ementa = text.replace(plMatch[0], '').trim().slice(0, 200);
          
          trending.push({
            plNumber: `${plMatch[2]}/${plMatch[3]}`,
            title: `${plMatch[1]} ${plMatch[2]}/${plMatch[3]} - Tramitação Urgente`,
            link: 'https://www.camara.leg.br/proposicoesWeb/prop_emtramitacao',
            excerpt: ementa,
            source: 'Câmara (Urgentes)',
            scrapedAt: new Date(),
          });
        }
      });

      await page.close();

      console.log(`✅ ${trending.length} PLs urgentes encontrados`);
      return trending;

    } catch (error) {
      console.error('❌ Erro ao fazer scraping de PLs urgentes:', error);
      return [];
    }
  }

  /**
   * Busca PLs em destaque em todas as fontes
   */
  async scrapeTrendingPLs(): Promise<TrendingPL[]> {
    console.log('🔍 Iniciando scraping de PLs em destaque de todas as fontes...');

    try {
      const [congressoEmFoco, poder360, urgentes] = await Promise.allSettled([
        this.scrapeCongressoEmFoco(),
        this.scrapePoder360(),
        this.scrapeUrgentPLs(),
      ]);

      const allTrending: TrendingPL[] = [];

      if (congressoEmFoco.status === 'fulfilled') {
        allTrending.push(...congressoEmFoco.value);
      }

      if (poder360.status === 'fulfilled') {
        allTrending.push(...poder360.value);
      }

      if (urgentes.status === 'fulfilled') {
        allTrending.push(...urgentes.value);
      }

      // Remove duplicatas (mesmo PL de fontes diferentes)
      const uniquePLs = this.removeDuplicates(allTrending);

      console.log(`✅ Total: ${uniquePLs.length} PLs únicos em destaque`);
      
      return uniquePLs;

    } catch (error) {
      console.error('❌ Erro geral no scraping:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Remove PLs duplicados (mantém o primeiro)
   */
  private removeDuplicates(pls: TrendingPL[]): TrendingPL[] {
    const seen = new Set<string>();
    return pls.filter((pl) => {
      if (seen.has(pl.plNumber)) {
        return false;
      }
      seen.add(pl.plNumber);
      return true;
    });
  }

  /**
   * Verifica se um PL específico está em destaque
   */
  async isPLTrending(plNumber: string): Promise<boolean> {
    const trending = await this.scrapeTrendingPLs();
    return trending.some((pl) => pl.plNumber === plNumber);
  }
}

export default new PLScraperService();
export type { TrendingPL };
