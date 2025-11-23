# 🎯 Serviço de Curadoria de PLs

Sistema híbrido que combina **API oficial da Câmara dos Deputados** + **Web Scraping** + **Análise com IA** para selecionar e distribuir os Projetos de Lei mais relevantes para os cidadãos.

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FONTES DE DADOS                          │
├─────────────────────────────────────────────────────────────┤
│  1. API Câmara    │  2. Web Scraping  │  3. Análise IA     │
│  - PLs oficiais   │  - Congresso Foco │  - Relevância      │
│  - Tramitação     │  - Poder360       │  - Impacto         │
│  - Votações       │  - PLs urgentes   │  - Áreas           │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────┐
            │  PIPELINE DE CURADORIA    │
            │  - Score 0-100            │
            │  - Filtros personalizados │
            │  - Top 10-15 PLs          │
            └───────────────────────────┘
                            ↓
            ┌───────────────────────────┐
            │   DISTRIBUIÇÃO            │
            │  - Jobs agendados (cron)  │
            │  - API REST endpoints     │
            │  - WhatsApp triggers      │
            └───────────────────────────┘
```

## 🚀 Serviços Implementados

### 1. **CamaraAPIService** (`camara-api.service.ts`)
Integração oficial com a API da Câmara dos Deputados.

**Endpoints principais:**
- `fetchRecentPLs()` - PLs da última semana
- `fetchProposicaoCompleta(id)` - Detalhes completos + autores + tramitação + votações
- `fetchProposicaoTexto(id)` - Texto integral do PL

**Documentação API:** https://dadosabertos.camara.leg.br/swagger/api.html

### 2. **PLScraperService** (`pl-scraper.service.ts`)
Web scraping para detectar PLs em destaque na mídia.

**Fontes:**
- Congresso em Foco
- Poder360
- Câmara (PLs urgentes)

**Métodos:**
- `scrapeTrendingPLs()` - Busca PLs em todas as fontes
- `isPLTrending(plNumber)` - Verifica se um PL está em destaque

### 3. **PLCurationService** (`pl-curation.service.ts`)
Pipeline principal de curadoria com IA.

**Algoritmo de relevância:**
```typescript
score = impactScore * 10  // Base (0-100)
  + (isTrending ? 20 : 0)  // Boost mídia
  + (urgency === 'high' ? 15 : 0)  // Boost urgência
  + (affectsCitizen ? 10 : 0)  // Boost impacto direto
  + (localRelevance ? 5 : 0)  // Boost local

// Filtro: score >= 50 && affectsCitizen === true
```

**Métodos públicos:**
- `curatePLsForWeek(filters)` - Pipeline completo
- `getTrendingPLs(limit)` - PLs em destaque
- `getUrgentPLs(limit)` - PLs urgentes
- `getPLsByArea(area, limit)` - PLs por tema
- `getCuratedPLById(id)` - Detalhes de um PL

### 4. **CronService** (`cron.service.ts`)
Agendamento automático de tarefas.

**Jobs configurados:**
- **Diário (6h AM):** Curadoria de PLs
- **Semanal (Segunda 8h AM):** Relatório semanal

**Métodos de controle:**
- `initialize()` - Inicia todos os jobs
- `runCurationNow()` - Execução manual
- `stopJob(name)` / `startJob(name)` - Controle individual
- `listJobs()` - Lista jobs ativos

## 🔌 API Endpoints

### PLs Curados

```http
GET /api/pls/curated
Query params:
  - minRelevanceScore: number (default: 60)
  - areas: string (comma-separated: "saúde,educação")
  - urgency: string ("high,medium,low")
  - onlyTrending: boolean
  - limit: number (default: 10)

Exemplo:
GET /api/pls/curated?areas=saúde,educação&limit=5&minRelevanceScore=70
```

### PLs em Destaque

```http
GET /api/pls/trending?limit=5

Response:
{
  "success": true,
  "total": 5,
  "data": [
    {
      "id": 123456,
      "numero": "1234",
      "ano": "2025",
      "ementa": "...",
      "relevanceScore": 85,
      "isTrending": true,
      "trendingSources": ["Congresso em Foco", "Poder360"],
      "citizenSummary": "Este PL propõe...",
      "impact": {
        "impactScore": 8,
        "areas": ["saúde", "economia"],
        "affectsCitizen": true,
        "urgency": "high",
        "reasoning": "..."
      }
    }
  ]
}
```

### PLs Urgentes

```http
GET /api/pls/urgent?limit=5
```

### PLs por Área

```http
GET /api/pls/by-area/saúde?limit=10

Áreas disponíveis:
- saúde
- educação
- segurança
- economia
- trabalho
- transporte
- meio-ambiente
- direitos
- tecnologia
- outros
```

### PL Específico

```http
GET /api/pls/:id

Exemplo:
GET /api/pls/2404518
```

### Executar Curadoria Manual (Admin)

```http
POST /api/pls/cron/run-curation

Response:
{
  "success": true,
  "message": "Curadoria executada com sucesso"
}
```

### Status dos Jobs

```http
GET /api/pls/cron/status

Response:
{
  "success": true,
  "jobs": ["daily_curation", "weekly_report"],
  "message": "2 jobs agendados"
}
```

## 🧪 Testando

### 1. Teste Manual da Curadoria

```bash
# Terminal
curl -X POST http://localhost:3001/api/pls/cron/run-curation
```

### 2. Buscar PLs Curados

```bash
curl "http://localhost:3001/api/pls/curated?limit=5&minRelevanceScore=70"
```

### 3. PLs de Saúde

```bash
curl "http://localhost:3001/api/pls/by-area/saúde?limit=3"
```

### 4. Status dos Jobs

```bash
curl http://localhost:3001/api/pls/cron/status
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# .env
OPENAI_API_KEY=sk-...
SERVER_PORT=3001
```

### Ajustar Agendamentos

Edite `src/services/cron.service.ts`:

```typescript
// Sintaxe cron: segundo minuto hora dia mês dia-da-semana
'0 6 * * *'      // 6h AM todo dia
'0 8 * * 1'      // 8h AM toda segunda-feira
'*/30 * * * *'   // A cada 30 minutos
'0 */2 * * *'    // A cada 2 horas
```

## 📊 Estrutura de Dados

### CuratedPL

```typescript
{
  // Identificação
  id: number,
  numero: string,
  ano: string,
  siglaTipo: "PL" | "PEC" | "PLP",
  
  // Conteúdo
  ementa: string,
  ementaDetalhada?: string,
  citizenSummary: string,  // Gerado pela IA
  
  // Status
  status: string,
  situacao: string,
  dataApresentacao: string,
  
  // Autores
  autores: Array<{
    id: number,
    nome: string,
    tipo: string
  }>,
  
  // Análise
  relevanceScore: number,  // 0-100
  isTrending: boolean,
  trendingSources?: string[],
  impact: {
    impactScore: number,      // 0-10
    areas: string[],
    affectsCitizen: boolean,
    urgency: "high" | "medium" | "low",
    reasoning: string,
    localRelevance?: boolean
  },
  
  // Votação
  hasVotacao: boolean,
  votingDate?: string,
  
  // Links
  urlInteiroTeor?: string,
  urlCamara: string
}
```

## 🎯 Próximos Passos

### 1. Integração com WhatsApp
```typescript
// Enviar PLs curados via WhatsApp
await whatsappService.sendCuratedPLs(userPhone, curatedPLs);
```

### 2. Persistência no Banco
```typescript
// Salvar PLs curados
await prisma.curatedPL.createMany({ data: curatedPLs });
```

### 3. Perfil de Usuário
```typescript
// Filtrar por interesses do usuário
const userProfile = await getUserProfile(phoneNumber);
const relevantPLs = await plCurationService.curatePLsForWeek({
  areas: userProfile.interests,
  minRelevanceScore: 70
});
```

### 4. Sistema de Notificações
```typescript
// Notificar usuários sobre novos PLs
await notificationService.sendWeeklyDigest(users, curatedPLs);
```

## 📝 Logs

O sistema gera logs detalhados:

```
🎯 Iniciando curadoria semanal de PLs...
✅ 87 PLs encontrados na API da Câmara
✅ 12 PLs em destaque encontrados
🎯 Curadoria concluída: 10 PLs selecionados

[CRON] Iniciando curadoria diária de PLs...
✅ [CRON] 15 PLs curados com sucesso
```

## 🔒 Considerações de Segurança

1. **Rate Limiting:** API da Câmara não tem rate limit documentado
2. **Web Scraping:** Respeita robots.txt e usa delays
3. **Custos OpenAI:** Limitado a 20 PLs por execução
4. **Timeout:** 30s para scraping, 10s para API

## 📚 Documentação Extra

- [API Câmara](https://dadosabertos.camara.leg.br/swagger/api.html)
- [Puppeteer](https://pptr.dev/)
- [Node-cron](https://www.npmjs.com/package/node-cron)
- [OpenAI API](https://platform.openai.com/docs)

---

**Desenvolvido para Devs Impacto 🏛️**
