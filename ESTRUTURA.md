# 📂 Estrutura do Projeto

## Visão Geral

```
voz-local-pipeline/
│
├── 📄 README.md                    ← COMECE AQUI
├── 📄 INTEGRACAO_BOT.md           ← Guia de integração
├── 📄 RESUMO.md                   ← Resumo executivo
│
├── 📦 requirements.txt            ← Dependências Python
├── 🔧 populate_sample_data.py     ← Dados de exemplo
│
├── 📁 src/                        ← Código fonte
│   ├── 📁 api/
│   │   └── main.py               ← API REST (FastAPI)
│   │
│   ├── 📁 core/                  ← Lógica principal
│   │   ├── database_init.py     ← Inicializa banco
│   │   ├── processor.py         ← Processa dados
│   │   ├── classifier.py        ← Classifica com IA
│   │   ├── calculator.py        ← Calcula métricas
│   │   └── error_handler.py     ← Tratamento de erros
│   │
│   ├── 📁 models/
│   │   └── database.py          ← 5 tabelas SQLAlchemy
│   │
│   ├── 📁 dashboard/
│   │   └── app.py               ← Dashboard Streamlit
│   │
│   └── 📁 utils/
│       └── queue.py             ← Fila temporária
│
├── 📁 data/
│   └── voz_local.db             ← Banco SQLite
│
└── 📁 tests/                     ← Testes
    ├── property/                ← Testes de propriedades
    └── unit/                    ← Testes unitários
```

---

## 🎯 Módulos Principais

### 1. API REST (`src/api/main.py`)

**3 Endpoints**:
- `POST /api/v1/proposals` - Registrar proposta
- `POST /api/v1/interactions` - Registrar opinião
- `GET /api/v1/metrics/lacuna` - Obter métricas

**Rodar**: `uvicorn src.api.main:app --reload`

---

### 2. Dashboard (`src/dashboard/app.py`)

**4 Páginas**:
- 🏠 Home - KPIs e overview
- 📉 Lacunas - Gráficos comparativos
- 💡 Propostas - Mais demandadas
- 🗺️ Mapa - Visualização geográfica

**Rodar**: `streamlit run src/dashboard/app.py`

---

### 3. Processador (`src/core/processor.py`)

**Funções**:
- `process_interaction()` - Valida e salva interações
- `process_proposal()` - Valida e salva propostas
- Cria cidadãos automaticamente

---

### 4. Classificador IA (`src/core/classifier.py`)

**Funções**:
- `classify_theme()` - Classifica tema com GPT-4
- `detect_similarity()` - Detecta propostas similares
- `find_similar_proposals()` - Agrupa duplicatas

**Requer**: `OPENAI_API_KEY`

---

### 5. Calculador (`src/core/calculator.py`)

**Funções**:
- `calculate_lacuna_by_theme()` - Por tema
- `calculate_lacuna_by_group()` - Por grupo
- `calculate_lacuna_by_city()` - Por cidade

**Fórmula**: `(Demandas - PLs) / Demandas × 100`

---

### 6. Banco de Dados (`src/models/database.py`)

**5 Tabelas**:
1. `cidadaos` - Cidadãos engajados
2. `projetos_lei` - PLs em tramitação
3. `interacoes` - Opiniões sobre PLs
4. `propostas_pauta` - Propostas cidadãs
5. `metricas_lacuna` - Cache de métricas

---

## 🔄 Fluxo de Dados

```
Bot WhatsApp
    ↓
API REST (FastAPI)
    ↓
Processor → Classifier (IA)
    ↓
SQLite Database
    ↓
Calculator (Métricas)
    ↓
Dashboard (Streamlit)
```

---

## 📦 Dependências Principais

- **FastAPI** - API REST
- **SQLAlchemy** - ORM
- **Streamlit** - Dashboard
- **Plotly** - Gráficos
- **OpenAI** - Classificação IA
- **Pandas** - Manipulação de dados

---

## 🚀 Comandos Rápidos

```bash
# Instalar
pip install -r requirements.txt

# Inicializar
python -m src.core.database_init
python populate_sample_data.py

# Rodar Dashboard
streamlit run src/dashboard/app.py

# Rodar API
uvicorn src.api.main:app --reload

# Testes
pytest tests/ -v
```

---

## 📊 Dados de Exemplo

`populate_sample_data.py` cria:
- 50 cidadãos
- 15 PLs em tramitação
- 100 interações (opiniões)
- 200 propostas de pauta

---

## 🎯 Para Jurados/Avaliadores

**Arquivos importantes**:
1. `README.md` - Visão geral completa
2. `INTEGRACAO_BOT.md` - Como integra com bot
3. `src/dashboard/app.py` - Dashboard (resultado visual)
4. `src/api/main.py` - API de integração

**Para testar**:
```bash
pip install -r requirements.txt
python -m src.core.database_init
python populate_sample_data.py
streamlit run src/dashboard/app.py
```

Dashboard abre em `http://localhost:8501` com dados de exemplo! 🎉
