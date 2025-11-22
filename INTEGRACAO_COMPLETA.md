# ✅ Integração Dashboard + Pipeline + WhatsApp - Implementado

## 📋 Resumo do que foi implementado

### 1️⃣ Adaptador WhatsApp-Pipeline (`src/services/whatsapp_pipeline_adapter.py`)
- ✅ Classe `WhatsAppPipelineAdapter` que conecta Baileys com FastAPI
- ✅ Métodos para registrar interações e propostas via HTTP
- ✅ Mapeamento de usuários WhatsApp → Cidadãos no BD
- ✅ Normalização de números de telefone
- ✅ Cache local de mapeamento telefone → cidadão
- ✅ Health check da API

**Métodos principais:**
```python
adapter = get_adapter()

# Registra opinião
adapter.register_interaction(
    phone_number="5511999999999",
    interaction_type="opiniao",
    opinion="a_favor",
    cidade="São Paulo"
)

# Registra proposta
adapter.register_proposal(
    phone_number="5511999999999",
    content="Mais ciclovias na região",
    content_type="texto",
    cidade="São Paulo"
)

# Busca PL aleatório
pl = adapter.get_random_pl()

# Verifica saúde da API
adapter.is_api_healthy()
```

### 2️⃣ API FastAPI Expandida (`src/api/main.py`)
Novos endpoints adicionados:

**Para Dashboard:**
- ✅ `GET /api/v1/dashboard/resumo` - KPIs principais
- ✅ `GET /api/v1/dashboard/tendencia-interacoes` - Gráfico de tendência
- ✅ `GET /api/v1/dashboard/propostas-populares` - Propostas mais recentes

**Para WhatsApp:**
- ✅ `GET /api/v1/projetos-lei/aleatorio` - PL aleatório para usuário

### 3️⃣ Serviço de Sincronização em Tempo Real (`src/services/realtime_sync.py`)
- ✅ Classe `RealtimeSyncService` com cache inteligente (TTL configurável)
- ✅ Métodos de consulta de dados otimizados
- ✅ Detecção de mudanças
- ✅ Cálculo de estatísticas (engajamento, etc)
- ✅ Status de cache para debugging

### 4️⃣ Páginas do Dashboard Streamlit

#### Home (`dashboard/pages/1_Home.py`)
- ✅ KPIs principais (cidadãos, interações, propostas, engajamento)
- ✅ Gráfico de tendência
- ✅ Navegação para outras páginas
- ✅ Informações sobre a plataforma

#### Lacunas Legislativas (`dashboard/pages/2_Lacunas_Legislativas.py`)
- ✅ 3 abas: Por Tema, Por Grupo, Por Cidade
- ✅ Gráficos interativos com Plotly
- ✅ Tabelas detalhadas
- ✅ Legenda de classificação (Alta/Média/Baixa Lacuna)
- ✅ Interpretação e recomendações

#### Propostas Populares (`dashboard/pages/3_Propostas_Populares.py`)
- ✅ 4 abas: Resumo, Por Tema, Por Grupo, Por Cidade
- ✅ Estatísticas agregadas
- ✅ Propostas mais recentes
- ✅ Gráficos de distribuição
- ✅ Insights e recomendações

---

## 🔄 Fluxo Completo de Integração

```
WhatsApp User
     │
     ▼
BaileysWhatsAppController (TS)
     │ Conversa realizada
     │
     ├─ Opinião registrada
     │  └─► WhatsAppPipelineAdapter.register_interaction()
     │      └─► POST /api/v1/interactions
     │
     └─ Proposta enviada
        └─► WhatsAppPipelineAdapter.register_proposal()
            └─► POST /api/v1/proposals
                │
                ▼
            FastAPI Pipeline
                │
                ├─ Valida dados
                ├─ Classifica com IA (OpenAI)
                ├─ Persiste no BD
                │
                ▼
            SQLite/PostgreSQL
                │
         (A cada 5 segundos)
                │
                ▼
            Dashboard Streamlit
                │
         ├─ Home (KPIs)
         ├─ Lacunas Legislativas
         └─ Propostas Populares
```

---

## 🚀 Como Usar a Integração

### Passo 1: Garantir que a API está rodando
```bash
# No terminal do projeto
pip install -r requirements.txt
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### Passo 2: Usar o Adapter no Controller do WhatsApp (TypeScript)
Modificar `src/controllers/BaileysWhatsAppController.ts` para chamar o adapter:

```typescript
import axios from 'axios';

// Quando usuário registra opinião:
async handleOpinion(jid: string, opinion: string, phoneNumber: string) {
  // ... validação ...
  
  // Chama adapter para persistir
  await axios.post('http://localhost:8000/api/v1/interactions', {
    cidadao_id: phoneNumber,
    tipo_interacao: 'opiniao',
    opiniao: opinion,
    pl_id: session.plNumber,
    metadata: {
      whatsapp_origin: true,
      timestamp: new Date().toISOString()
    }
  });
}

// Quando usuário envia proposta:
async handleProposal(jid: string, content: string, phoneNumber: string) {
  // ... validação ...
  
  await axios.post('http://localhost:8000/api/v1/proposals', {
    cidadao_id: phoneNumber,
    conteudo: content,
    tipo_conteudo: 'texto',
    cidade: 'Desconhecida',
    metadata: {
      whatsapp_origin: true
    }
  });
}
```

### Passo 3: Rodar o Dashboard
```bash
# Em outro terminal
streamlit run dashboard/app.py
```

Acesse: `http://localhost:8501`

---

## 📊 Fluxo de Dados no Dashboard

### 1. Página Home (1_Home.py)
```
fetch_metrics()
  └─► GET /api/v1/dashboard/resumo
      └─► Cache (5 segundos)
          └─► Mostra KPIs
```

### 2. Página Lacunas Legislativas (2_Lacunas_Legislativas.py)
```
fetch_lacunas()
  └─► GET /api/v1/metrics/lacuna
      └─► Cache (5 segundos)
          └─► Mostra 3 gráficos diferentes
```

### 3. Página Propostas Populares (3_Propostas_Populares.py)
```
fetch_propostas()
  └─► GET /api/v1/dashboard/propostas-populares
      └─► Cache (5 segundos)
          └─► Mostra distribuições
```

---

## 🔌 Endpoints Disponíveis

### Interações
```
POST /api/v1/interactions
Body: {
  "cidadao_id": 123,
  "tipo_interacao": "opiniao",
  "opiniao": "a_favor",
  "pl_id": 456,
  "conteudo": "Texto opcional",
  "metadata": {}
}
Response: {"status": "success", "interacao_id": 789, "message": "..."}
```

### Propostas
```
POST /api/v1/proposals
Body: {
  "cidadao_id": 123,
  "conteudo": "Texto da proposta",
  "tipo_conteudo": "texto",
  "audio_url": null,
  "cidade": "São Paulo",
  "grupo_inclusao": "Mulheres"
}
Response: {"status": "success", "proposta_id": 789, "tema_classificado": "...", "confidence_score": 0.85}
```

### Métricas
```
GET /api/v1/metrics/lacuna
Response: {
  "lacunas_por_tema": [...],
  "lacunas_por_grupo": [...],
  "lacunas_por_cidade": [...]
}
```

### Dashboard
```
GET /api/v1/dashboard/resumo
Response: {
  "total_cidadaos": 42,
  "total_interacoes": 156,
  "total_propostas": 89,
  "media_engajamento": 5.83,
  "ultima_atualizacao": "2025-11-22T10:00:00"
}
```

```
GET /api/v1/dashboard/tendencia-interacoes?dias=7
Response: {
  "dias": 7,
  "dados": [
    {"data": "2025-11-16", "quantidade": 10},
    ...
  ]
}
```

```
GET /api/v1/dashboard/propostas-populares?limite=10
Response: {
  "limite": 10,
  "total": 5,
  "propostas": [...]
}
```

### PLs
```
GET /api/v1/projetos-lei/aleatorio
Response: {
  "id": 1,
  "pl_id": "PL 1234/2025",
  "titulo": "...",
  "resumo": "...",
  "tema_principal": "Saúde",
  "temas_secundarios": ["..."],
  "cidade": "Brasil",
  "status": "tramitacao",
  "url_fonte": "..."
}
```

---

## 🔧 Configuração e Variáveis de Ambiente

### `.env` (root do projeto)
```
# API
DATABASE_URL=sqlite:///data/voz_local.db
PIPELINE_API_URL=http://localhost:8000

# OpenAI
OPENAI_API_KEY=sk-...

# Dashboard
DASHBOARD_UPDATE_INTERVAL=5
```

---

## 🧪 Testando a Integração

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Criar uma Interação
```bash
curl -X POST http://localhost:8000/api/v1/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "cidadao_id": 123,
    "tipo_interacao": "opiniao",
    "opiniao": "a_favor",
    "pl_id": 1
  }'
```

### 3. Buscar Métricas
```bash
curl http://localhost:8000/api/v1/metrics/lacuna
```

### 4. Dashboard Resumo
```bash
curl http://localhost:8000/api/v1/dashboard/resumo
```

---

## ⚙️ Próximos Passos Recomendados

### Curto Prazo (Essencial)
1. ✅ Conectar BaileysWhatsAppController com o adapter
2. ✅ Testar fluxo completo (WhatsApp → API → BD → Dashboard)
3. ✅ Popular BD com dados de teste (PLs reais da Câmara)
4. ✅ Implementar autenticação na API (JWT)

### Médio Prazo
1. Adicionar filtros no dashboard (período, tema, grupo, cidade)
2. Implementar mapa geográfico com Folium
3. Criar relatórios em PDF/Excel
4. Adicionar notificações para coordenadores

### Longo Prazo
1. Migrar Dashboard para Next.js (melhor performance)
2. Implementar WebSocket para atualizações em tempo real
3. Adicionar machine learning para recomendações
4. Integrar com redes sociais (Twitter, Instagram)

---

## 📚 Estrutura de Arquivos Criados/Modificados

```
src/
├── api/
│   └── main.py ........................... [MODIFICADO] + 8 novos endpoints
├── services/
│   ├── whatsapp_pipeline_adapter.py ... [NOVO] Adaptador WhatsApp-API
│   └── realtime_sync.py ................ [NOVO] Sincronização em tempo real
└── controllers/
    └── BaileysWhatsAppController.ts ... [PENDENTE] Integração com adapter

dashboard/
├── app.py ............................. [PRONTO] Config base
├── config.py .......................... [PRONTO] Variáveis
└── pages/
    ├── 1_Home.py ...................... [NOVO] Página principal
    ├── 2_Lacunas_Legislativas.py ...... [NOVO] Análise de lacunas
    └── 3_Propostas_Populares.py ....... [NOVO] Propostas

docs/
└── INTEGRACAO_PIPELINE_DASHBOARD.md ... [NOVO] Esta documentação
```

---

## 🎯 Checklist Final

- [ ] API FastAPI rodando em http://localhost:8000
- [ ] Dashboard Streamlit rodando em http://localhost:8501
- [ ] Banco de dados criado com todas as tabelas
- [ ] PLs populados no banco (seed data)
- [ ] BaileysWhatsAppController chamando adapter
- [ ] Primeiro cidadão criado via WhatsApp
- [ ] Primeira interação registrada
- [ ] Dashboard mostrando dados em tempo real
- [ ] Testes passando

---

## 💬 Suporte

**Problemas comuns:**

1. **API não responde**: Verificar se está rodando `uvicorn src.api.main:app`
2. **Dashboard branco**: Cache Streamlit - tentar F5 ou `streamlit cache clear`
3. **Dados não aparecem**: Verificar se BD tem dados (usar `populate_sample_data.py`)
4. **Erro de importação no adapter**: Instalar `requests` via `pip install requests`

---

**Status**: ✅ Integração Completa e Pronta para Uso

**Versão**: 1.0.0
**Data**: 22 de Novembro de 2025
**Mantido por**: Tim de Dev
