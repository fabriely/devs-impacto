# Voz.Local - Pipeline de Dados e Dashboard

Sistema de captura, processamento e visualização de interações cidadãs sobre Projetos de Lei.

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Inicializar Banco de Dados

```bash
python -m src.core.database_init
python populate_sample_data.py
```

### 3. Rodar Dashboard

```bash
streamlit run src/dashboard/app.py
```

Dashboard abre em `http://localhost:8501` 🎉

---

## 📁 Estrutura do Projeto

```
voz-local-pipeline/
│
├── src/
│   ├── api/main.py              # API REST (FastAPI)
│   ├── core/                    # Lógica principal
│   │   ├── database_init.py     # Inicializa banco
│   │   ├── processor.py         # Processa dados
│   │   ├── classifier.py        # Classifica com IA
│   │   └── calculator.py        # Calcula métricas
│   ├── models/database.py       # 5 tabelas SQLAlchemy
│   └── dashboard/app.py         # Dashboard Streamlit
│
├── data/voz_local.db           # Banco SQLite
├── requirements.txt            # Dependências
└── populate_sample_data.py     # Dados de exemplo
```

---

## 🔌 Integração com Bot WhatsApp

### No seu bot Node.js:

```typescript
import axios from 'axios';

const PIPELINE_API = 'http://localhost:8000/api/v1';

// Quando cidadão envia proposta
async function enviarProposta(cidadaoId: number, texto: string, cidade: string) {
  const response = await axios.post(`${PIPELINE_API}/proposals`, {
    cidadao_id: cidadaoId,
    conteudo: texto,
    tipo_conteudo: 'texto',
    cidade: cidade
  });
  
  console.log('Tema classificado:', response.data.tema_classificado);
}

// Quando cidadão opina sobre PL
async function enviarOpiniao(cidadaoId: number, plId: number, opiniao: string) {
  await axios.post(`${PIPELINE_API}/interactions`, {
    cidadao_id: cidadaoId,
    pl_id: plId,
    tipo_interacao: 'opiniao',
    opiniao: opiniao // 'a_favor', 'contra', 'pular'
  });
}
```

**Veja detalhes completos em**: `INTEGRACAO_BOT.md`

---

## 🗄️ API REST

### Rodar servidor:
```bash
uvicorn src.api.main:app --reload --port 8000
```

### Endpoints:

**1. Registrar Proposta**
```bash
POST /api/v1/proposals
{
  "cidadao_id": 1,
  "conteudo": "Precisamos de mais hospitais",
  "tipo_conteudo": "texto",
  "cidade": "São Paulo"
}
```

**2. Registrar Opinião**
```bash
POST /api/v1/interactions
{
  "cidadao_id": 1,
  "pl_id": 1,
  "tipo_interacao": "opiniao",
  "opiniao": "a_favor"
}
```

**3. Obter Métricas**
```bash
GET /api/v1/metrics/lacuna
```

---

## 📊 Dashboard

### 4 Páginas:

1. **🏠 Home**: KPIs + Top 5 lacunas
2. **📉 Lacunas Legislativas**: Gráficos por tema/grupo/cidade
3. **💡 Propostas Populares**: Mais demandadas
4. **🗺️ Mapa de Engajamento**: Visualização geográfica

### Features:
- Auto-refresh a cada 5 segundos
- Gráficos interativos (Plotly)
- Exportar dados para CSV

---

## 🧮 Métrica de Lacuna Legislativa

**Fórmula**:
```
Lacuna = (Demandas Cidadãos - PLs Tramitação) / Demandas Cidadãos × 100
```

**Classificação**:
- 🔴 **Alta** (≥70%): Legislativo ignorando demandas
- 🟡 **Média** (40-69%): Atenção parcial
- 🟢 **Baixa** (<40%): Boa atenção

---

## 🤖 Classificação com IA

### Configurar OpenAI (Opcional):

```bash
# Windows
$env:OPENAI_API_KEY="sua-chave"

# Linux/Mac
export OPENAI_API_KEY="sua-chave"
```

O sistema usa **GPT-4** para classificar propostas em 11 temas:
- Saúde, Educação, Transporte, Segurança, Meio Ambiente
- Habitação, Cultura, Esporte, Assistência Social
- Infraestrutura, Outros

> **Nota**: Dashboard funciona sem OpenAI, mas classificação será manual.

---

## 🛠️ Comandos Úteis

```bash
# Instalar dependências
pip install -r requirements.txt

# Inicializar banco
python -m src.core.database_init

# Popular dados de exemplo
python populate_sample_data.py

# Rodar dashboard
streamlit run src/dashboard/app.py

# Rodar API
uvicorn src.api.main:app --reload

# Rodar testes
pytest tests/ -v
```

---

## 🐛 Troubleshooting

### "No module named 'X'"
```bash
pip install -r requirements.txt
```

### "Database not found"
```bash
python -m src.core.database_init
python populate_sample_data.py
```

### "Port already in use"
```bash
streamlit run src/dashboard/app.py --server.port 8502
```

---

## 📚 Documentação

- **`README.md`** (este arquivo): Visão geral
- **`INTEGRACAO_BOT.md`**: Guia de integração com bot WhatsApp
- **API Docs**: `http://localhost:8000/docs` (quando API rodando)

---

## 🎯 Arquitetura

```
┌─────────────┐
│ Bot WhatsApp│ (Node.js)
│  (Baileys)  │
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────┐
│  FastAPI    │ (Python)
│   /api/v1   │
└──────┬──────┘
       │
       ├─► Processor ──► SQLite
       ├─► AI Classifier (GPT-4)
       └─► Metrics Calculator
              │
              ▼
       ┌─────────────┐
       │  Dashboard  │ (Streamlit)
       └─────────────┘
```

---

**Desenvolvido para democratizar o acesso à informação legislativa** ❤️
