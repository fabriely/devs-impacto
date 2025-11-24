# 🏛️ Voz.Local - Documentação Completa do Projeto

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Modelos de Dados](#modelos-de-dados)
5. [Funcionalidades Implementadas](#funcionalidades-implementadas)
6. [API REST](#api-rest)
7. [Dashboard](#dashboard)
8. [Integrações](#integrações)
9. [Configuração e Deploy](#configuração-e-deploy)
10. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Visão Geral

**Voz.Local** é uma plataforma de engajamento cidadão que conecta cidadãos ao poder legislativo através do WhatsApp. O sistema permite que cidadãos:
- Enviem propostas de pautas legislativas via texto ou áudio
- Opinem sobre Projetos de Lei em tramitação
- Acompanhem a lacuna legislativa entre suas demandas e os PLs existentes

### Problema que Resolve
- **Distanciamento** entre cidadãos e poder legislativo
- **Falta de representatividade** das pautas populares
- **Baixo engajamento** cidadão em questões legislativas
- **Assimetria de informação** sobre projetos de lei

### Solução
Sistema automatizado que:
1. Coleta propostas cidadãs via WhatsApp
2. Classifica automaticamente usando IA (GPT-4)
3. Monitora PLs em tramitação na Câmara dos Deputados
4. Calcula métricas de lacuna legislativa
5. Envia PLs relevantes para os cidadãos opinarem
6. Visualiza dados em dashboard interativo

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    CIDADÃOS (WhatsApp)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              BOT WHATSAPP (Baileys)                         │
│  - Recebe mensagens de texto e áudio                        │
│  - Envia PLs para votação                                   │
│  - Gerenciamento de sessão                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    API REST (Express)                       │
│  - Endpoints de métricas                                    │
│  - Endpoints de classificação                               │
│  - Endpoints de webhooks                                    │
│  - Endpoints de processamento                               │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────────────┐
│  OpenAI    │ │   Câmara   │ │    PostgreSQL      │
│   GPT-4    │ │    API     │ │   (Prisma ORM)     │
│            │ │            │ │                    │
│ Classifica │ │  Busca PLs │ │ - Cidadãos         │
│   Temas    │ │  Monitora  │ │ - Propostas        │
│            │ │ Tramitação │ │ - Interações       │
└────────────┘ └────────────┘ │ - Projetos de Lei  │
                               │ - Métricas         │
                               └────────────────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │   DASHBOARD        │
                              │   (Next.js)        │
                              │                    │
                              │ - KPIs             │
                              │ - Gráficos         │
                              │ - Tabelas          │
                              │ - Top Lacunas      │
                              └────────────────────┘
```

### Fluxo de Dados

#### 1. **Proposta Cidadã**
```
WhatsApp → Bot → Classificador AI → Banco de Dados → Dashboard
```

#### 2. **Monitoramento de PLs**
```
Câmara API → Curadoria → Web Scraping → AI Analysis → Banco de Dados
```

#### 3. **Cálculo de Lacunas**
```
Propostas + PLs → Agregação por Tema → Cálculo % → Cache → Dashboard
```

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** v18+ com TypeScript
- **Express.js** - Framework web
- **Prisma ORM** - ORM para PostgreSQL
- **Baileys** v7.0 - WhatsApp Web API
- **OpenAI API** - GPT-4 para classificação
- **Axios** - HTTP client
- **Node-Cron** - Agendamento de tarefas
- **IORedis** - Cache Redis
- **Winston** - Logging
- **Helmet** - Segurança
- **CORS** - Cross-origin

### Frontend (Dashboard)
- **Next.js 14** - Framework React
- **React Query (TanStack Query)** - Gerenciamento de estado
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **Recharts** - Gráficos

### Banco de Dados
- **PostgreSQL** - Banco principal
- **Redis** - Cache de métricas

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **pnpm** - Gerenciador de pacotes

### Serviços Externos
- **OpenAI GPT-4** - Classificação de temas
- **Câmara dos Deputados API** - Dados de PLs
- **WhatsApp Business API** (Baileys) - Comunicação

---

## 💾 Modelos de Dados

### 1. **Cidadao**
Representa um cidadão que interage com o sistema.

```prisma
model Cidadao {
  id             Int              @id @default(autoincrement())
  telefone_hash  String           @unique // Hash do telefone
  cidade         String
  grupo_inclusao String?          // Ex: "idoso", "PCD"
  temas_interesse String?         // JSON array
  created_at     DateTime
  updated_at     DateTime
  
  interacoes     Interacao[]
  propostas      PropostaPauta[]
}
```

**Campos:**
- `telefone_hash`: Hash SHA256 do número (LGPD)
- `cidade`: Cidade do cidadão
- `grupo_inclusao`: Grupo de inclusão (opcional)
- `temas_interesse`: Array JSON de temas de interesse

---

### 2. **PropostaPauta**
Propostas enviadas por cidadãos via WhatsApp.

```prisma
model PropostaPauta {
  id                 Int       @id
  cidadao_id         Int
  conteudo           String    @db.Text
  tipo_conteudo      String    // "texto" ou "audio_transcrito"
  audio_url          String?
  tema_principal     String?   // Classificado por IA
  temas_secundarios  String?   // JSON array
  confidence_score   Float?    // Confiança da classificação
  cidade             String
  grupo_inclusao     String?
  embedding          String?   // Vetor para similaridade
  similaridade_grupo Int?
  timestamp          DateTime
  created_at         DateTime
}
```

**Funcionalidades:**
- Suporta texto e áudio (transcrito)
- Classificação automática de tema
- Score de confiança da IA
- Agrupamento por similaridade

---

### 3. **ProjetoLei**
PLs monitorados da Câmara dos Deputados.

```prisma
model ProjetoLei {
  id                 Int         @id
  pl_id              String      @unique // Ex: "PL 1234/2024"
  titulo             String
  resumo             String?
  tema_principal     String
  temas_secundarios  String?     // JSON array
  cidade             String?
  status             String?     // "Em tramitação", "Aprovado"
  url_fonte          String?
  created_at         DateTime
  
  interacoes         Interacao[]
}
```

**Origem dos Dados:**
- API oficial da Câmara
- Web scraping de notícias
- Curadoria por IA

---

### 4. **Interacao**
Interações dos cidadãos com PLs.

```prisma
model Interacao {
  id              Int         @id
  cidadao_id      Int
  pl_id           Int?
  tipo_interacao  String      // "opiniao", "visualizacao"
  opiniao         String?     // "a_favor", "contra", "pular"
  conteudo        String?
  metadata        String?     // JSON
  timestamp       DateTime
  created_at      DateTime
}
```

**Tipos de Interação:**
- `opiniao`: Cidadão opinou sobre PL
- `visualizacao`: Cidadão visualizou PL
- `reacao`: Cidadão reagiu ao PL

---

### 5. **MetricaLacuna**
Cache de métricas de lacuna legislativa.

```prisma
model MetricaLacuna {
  id                Int       @id
  tipo_agregacao    String    // "tema", "grupo", "cidade"
  chave             String    // Valor específico
  demandas_cidadaos Int
  pls_tramitacao    Int
  percentual_lacuna Float
  classificacao     String    // "Alta", "Média", "Baixa"
  periodo_inicio    DateTime
  periodo_fim       DateTime
  created_at        DateTime
}
```

**Cálculo da Lacuna:**
```
Percentual = ((demandas - pls) / demandas) * 100
```

**Classificação:**
- `Alta Lacuna`: ≥ 70%
- `Média Lacuna`: 40-69%
- `Baixa Lacuna`: < 40%

---

## ⚙️ Funcionalidades Implementadas

### 1. **Bot WhatsApp (Baileys)**

#### Recursos:
- ✅ Conexão via QR Code
- ✅ Recebimento de mensagens de texto
- ✅ Recebimento de áudio (com transcrição)
- ✅ Envio de mensagens individuais
- ✅ Envio de PLs formatados
- ✅ Gerenciamento de sessão persistente
- ✅ Reconexão automática
- ✅ LID mapping (descriptografia)

#### Endpoints:
```typescript
POST /api/baileys/send-message
POST /api/baileys/send-pl
GET  /api/baileys/qr
GET  /api/baileys/status
```

---

### 2. **Classificador de Temas (IA)**

#### Tecnologia: OpenAI GPT-4

#### Temas Suportados:
1. Saúde
2. Educação
3. Segurança Pública
4. Transporte e Mobilidade
5. Infraestrutura Urbana
6. Meio Ambiente
7. Cultura e Lazer
8. Assistência Social
9. Habitação
10. Economia e Trabalho

#### Processo:
1. Cidadão envia proposta
2. GPT-4 analisa o conteúdo
3. Retorna tema + score de confiança
4. Salva no banco de dados

#### Endpoint:
```typescript
POST /api/classifier/theme
Body: { conteudo: string }
Response: {
  tema: string,
  confidence: number,
  temas_secundarios: string[]
}
```

---

### 3. **Curadoria de PLs**

#### Pipeline:
1. **Busca na API da Câmara**: 100 PLs mais recentes
2. **Web Scraping**: PLs em destaque na mídia
3. **Análise de Relevância**: IA avalia impacto cidadão
4. **Filtragem**: Score > 70
5. **Ranqueamento**: Por relevância e urgência

#### Critérios de Relevância:
- **Impact Score** (0-10): Impacto direto na vida do cidadão
- **Áreas**: Saúde, educação, etc.
- **Urgência**: Alta, média, baixa
- **Trending**: Se está em destaque na mídia
- **Local Relevance**: Se afeta município específico

#### Endpoint:
```typescript
POST /api/pls/cron/run-curation
GET  /api/pls/curated
```

---

### 4. **Cálculo de Métricas**

#### Métricas Disponíveis:

**Por Tema:**
```json
{
  "tema": "Saúde",
  "demandasCidadaos": 150,
  "plsTramitacao": 45,
  "percentualLacuna": 70.0,
  "classificacao": "Alta Lacuna"
}
```

**Por Grupo de Inclusão:**
```json
{
  "grupo": "Idosos",
  "demandasCidadaos": 80,
  "plsTramitacao": 25,
  "percentualLacuna": 68.75
}
```

**Por Cidade:**
```json
{
  "cidade": "Recife",
  "demandasCidadaos": 200,
  "plsTramitacao": 50,
  "percentualLacuna": 75.0
}
```

#### Endpoints:
```typescript
GET /api/metrics/lacuna/theme
GET /api/metrics/lacuna/group
GET /api/metrics/lacuna/city
GET /api/metrics/summary
GET /api/metrics/proposals/stats
```

---

### 5. **Dashboard Interativo**

#### Tecnologia: Next.js 14 + React Query

#### Componentes:

**KPI Cards:**
- Total de Cidadãos
- Propostas Cidadãs
- PLs em Tramitação
- Lacuna Geral (%)

**Top 5 Lacunas:**
- Lista dos 5 temas com maior lacuna
- Indicador visual de severidade
- Detalhamento de demandas vs PLs

**Gráficos:**
- Lacuna por tema (bar chart)
- Evolução temporal
- Distribuição geográfica

**Tabela de Propostas:**
- 10 propostas mais recentes
- Filtros por tipo, tema, cidade
- Paginação

#### Recursos:
- ✅ Auto-refresh a cada 30 segundos
- ✅ Responsivo (mobile, tablet, desktop)
- ✅ Loading states
- ✅ Error handling
- ✅ Cache com React Query

#### URL:
```
http://localhost:3000
```

---

### 6. **Sistema de Cache (Redis)**

#### Estratégia:
- **Métricas**: Cache de 5 minutos
- **Propostas**: Cache de 1 minuto
- **PLs Curados**: Cache de 30 minutos

#### Endpoints de Gerenciamento:
```typescript
GET    /api/health/redis
POST   /api/health/redis/flush
DELETE /api/health/redis/metrics
DELETE /api/health/redis/proposals
```

---

### 7. **Jobs Agendados (Cron)**

#### Jobs Ativos:

**1. Curadoria de PLs**
- **Frequência**: Diária às 8h
- **Função**: Busca e analisa novos PLs
- **Duração**: ~5-10 minutos

**2. Recalcular Métricas**
- **Frequência**: A cada 6 horas
- **Função**: Atualiza cache de métricas
- **Duração**: ~1-2 minutos

**3. Envio de PLs Relevantes**
- **Frequência**: Semanal (segunda-feira 10h)
- **Função**: Envia PLs para cidadãos opinarem
- **Duração**: ~10-15 minutos

#### Gerenciamento:
```typescript
POST /api/pls/cron/run-curation  // Executa manualmente
```

---

### 8. **Monitoramento e Logs**

#### Sistema de Logs:
- **Winston**: Logs estruturados
- **Pino**: Logs de performance
- **Express-Winston**: Logs HTTP

#### Níveis:
- `error`: Erros críticos
- `warn`: Avisos
- `info`: Informações gerais
- `debug`: Debugging

#### Health Checks:
```typescript
GET /api/health           // Status geral
GET /api/health/detailed  // Detalhado
GET /api/health/redis     // Status Redis
```

---

## 🔌 API REST

### Base URL
```
http://localhost:3001
```

### Endpoints Principais

#### **1. Métricas**

```bash
# Lacuna por tema
GET /api/metrics/lacuna/theme

# Lacuna por grupo
GET /api/metrics/lacuna/group

# Lacuna por cidade
GET /api/metrics/lacuna/city

# Resumo geral
GET /api/metrics/summary

# Estatísticas de propostas
GET /api/metrics/proposals/stats
```

#### **2. Classificação**

```bash
# Classificar tema de proposta
POST /api/classifier/theme
Content-Type: application/json
{
  "conteudo": "Precisamos de mais postos de saúde"
}
```

#### **3. Propostas**

```bash
# Criar proposta
POST /api/proposals
Content-Type: application/json
{
  "cidadao_id": 1,
  "conteudo": "...",
  "tipo_conteudo": "texto",
  "cidade": "Recife"
}

# Listar propostas
GET /api/proposals?limit=10&offset=0
```

#### **4. WhatsApp**

```bash
# Status da conexão
GET /api/baileys/status

# QR Code
GET /api/baileys/qr

# Enviar mensagem
POST /api/baileys/send-message
{
  "to": "5581999999999",
  "message": "Olá!"
}
```

#### **5. Webhooks**

```bash
# Receber PL da Câmara
POST /api/webhook/camara-pls
{
  "pl_id": "PL 1234/2024",
  "titulo": "...",
  "ementa": "..."
}
```

---

## 📊 Dashboard

### Acessar
```bash
cd dashboard
npm install
npm run dev
```

### URL
```
http://localhost:3000
```

### Telas

#### **1. Home (Dashboard Principal)**
- KPIs principais
- Top 5 lacunas legislativas
- Gráfico de lacuna por tema
- Estatísticas de propostas
- Tabela de propostas recentes

#### **2. Responsividade**
- Mobile: 320px+
- Tablet: 768px+
- Desktop: 1024px+

---

## 🔗 Integrações

### 1. **Twitter/X (Publicação Automática)**

#### Funcionalidades:
- ✅ Tweet automático quando novo PL é adicionado
- ✅ Alerta de lacuna legislativa alta (≥ 70%)
- ✅ Resumo semanal automático
- ✅ Tweet quando PL é aprovado
- ✅ API manual para publicar tweets

#### Setup:
```bash
# .env
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
```

#### Endpoints:
```bash
# Status da conexão
GET /api/twitter/status

# Publicar tweet sobre PL
POST /api/twitter/tweet/pl/:id

# Publicar alerta de lacuna
POST /api/twitter/tweet/lacuna/:tema

# Publicar resumo semanal
POST /api/twitter/tweet/weekly-summary
```

#### Documentação Completa:
Ver [INTEGRACAO_TWITTER.md](./INTEGRACAO_TWITTER.md) para detalhes completos.

---

### 2. **WhatsApp (Baileys)**

#### Setup:
```bash
# Inicia o bot
npm run dev

# Escaneia QR Code
# Acesse: http://localhost:3001/api/baileys/qr
```

#### Uso:
```typescript
import whatsappService from '@/services/whatsapp.service';

// Enviar mensagem
await whatsappService.sendMessage(
  '5581999999999@s.whatsapp.net',
  { text: 'Olá!' }
);

// Enviar mídia
await whatsappService.sendMedia(
  '5581999999999@s.whatsapp.net',
  '/path/to/image.jpg',
  'image'
);
```

---

### 3. **OpenAI GPT-4**

#### Setup:
```bash
# .env
OPENAI_API_KEY=sk-...
```

#### Uso:
```typescript
import openaiService from '@/services/openai.service';

const resultado = await openaiService.classifyTheme(
  'Precisamos de mais escolas'
);

console.log(resultado.tema); // "Educação"
console.log(resultado.confidence); // 0.95
```

---

### 4. **Câmara dos Deputados API**

#### Endpoints Usados:
```
GET /proposicoes?ordem=DESC&ordenarPor=id
GET /proposicoes/{id}
GET /proposicoes/{id}/autores
GET /proposicoes/{id}/tramitacoes
```

#### Uso:
```typescript
import camaraAPIService from '@/services/camara-api.service';

// Buscar PLs recentes
const { dados } = await camaraAPIService.fetchRecentPLs(100);

// Detalhes de um PL
const detalhes = await camaraAPIService.fetchPLDetails(2345678);
```

---

### 5. **Redis Cache**

#### Setup:
```bash
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

#### Uso:
```typescript
import redisCacheService from '@/services/redis-cache.service';

// Salvar
await redisCacheService.set('key', { data: '...' }, 300); // 5min

// Buscar
const data = await redisCacheService.get('key');

// Invalidar
await redisCacheService.del('key');
```

---

## 🚀 Configuração e Deploy

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (opcional)

### Instalação Local

#### 1. **Clone o repositório**
```bash
git clone <repo-url>
cd devs-impacto
```

#### 2. **Instale dependências**
```bash
pnpm install
cd dashboard && npm install
```

#### 3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
```

Edite `.env`:
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/vozlocal"

# OpenAI
OPENAI_API_KEY="sk-..."

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Server
SERVER_PORT=3001
NODE_ENV=development
```

#### 4. **Rode migrations**
```bash
pnpm migration
```

#### 5. **Seed dados de exemplo**
```bash
pnpm seed
```

#### 6. **Inicie o servidor**
```bash
pnpm dev
```

#### 7. **Inicie o dashboard**
```bash
cd dashboard
npm run dev
```

---

### Deploy com Docker

#### 1. **Build**
```bash
docker-compose build
```

#### 2. **Start**
```bash
docker-compose up -d
```

#### 3. **Logs**
```bash
docker-compose logs -f
```

#### 4. **Stop**
```bash
docker-compose down
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Registrar Proposta

```typescript
// Do bot WhatsApp
import axios from 'axios';

const response = await axios.post('http://localhost:3001/api/proposals', {
  cidadao_id: 1,
  conteudo: 'Precisamos de mais creches públicas no bairro',
  tipo_conteudo: 'texto',
  cidade: 'Recife',
  grupo_inclusao: null
});

console.log(response.data.tema_classificado); // "Educação"
```

---

### Exemplo 2: Buscar Métricas

```typescript
// Do dashboard
import { getLacunaByTheme } from '@/lib/api';

const lacunas = await getLacunaByTheme();

lacunas.forEach(lacuna => {
  console.log(`${lacuna.tema}: ${lacuna.percentualLacuna}%`);
});
```

---

### Exemplo 3: Enviar PL via WhatsApp

```typescript
import whatsappService from '@/services/whatsapp.service';

const pl = {
  numero: 'PL 1234/2024',
  titulo: 'Cria programa de saúde preventiva',
  resumo: 'Estabelece ações de prevenção...',
  autores: ['Dep. João Silva']
};

await whatsappService.sendPLToUser(
  '5581999999999@s.whatsapp.net',
  pl
);
```

---

## 📈 Métricas de Sucesso

### KPIs Monitorados:
- **Engajamento**: Taxa de resposta dos cidadãos
- **Cobertura**: % de temas com propostas
- **Lacuna**: % médio de lacuna legislativa
- **Velocidade**: Tempo médio de classificação
- **Qualidade**: Score de confiança médio da IA

---

## 🔐 Segurança

### Implementado:
- ✅ Hash de telefones (LGPD)
- ✅ Helmet (headers de segurança)
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Validação de entrada (Zod)
- ✅ Sanitização de dados
- ✅ Logs de auditoria

---

## 🧪 Testes

### Rodar testes:
```bash
pnpm test
```

### Cobertura:
```bash
pnpm test:ci
```

---

## 📚 Documentação Adicional

- [API Examples](../API_EXAMPLES.md)

---

## 📝 Licença

MIT License - veja [LICENSE](../LICENSE) para detalhes.

---

## 👥 Equipe

Desenvolvido por **Devs Impacto** para o hackathon.

---

## 📞 Suporte

- Email: suporte@vozlocal.com.br
- GitHub Issues: [Criar issue](https://github.com/...)

---

**Última atualização:** 23 de novembro de 2025
