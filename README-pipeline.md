# Voz.Local Pipeline

Pipeline de dados completo para captura, processamento e visualização de interações cidadãs sobre Projetos de Lei.

## Visão Geral

O Voz.Local Pipeline conecta três componentes principais:

1. **Bot WhatsApp (Baileys)** - Captura interações dos cidadãos
2. **Pipeline de Dados Python** - Processa, classifica e armazena dados usando IA
3. **Dashboard Streamlit** - Visualiza métricas de accountability e lacunas legislativas

## Requisitos

- Python 3.11+
- uv (gerenciador de pacotes Python)
- OpenAI API Key

## Instalação

### 1. Criar ambiente virtual

```bash
# Criar virtual environment com uv
uv venv .venv

# Ativar ambiente virtual
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
```

### 2. Instalar dependências

```bash
uv pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env e adicionar suas credenciais
# Especialmente: OPENAI_API_KEY
```

### 4. Inicializar banco de dados

```bash
python -m src.models.database
```

## Estrutura do Projeto

```
voz-local-pipeline/
├── .venv/                    # Virtual environment (uv)
├── data/
│   ├── voz_local.db         # SQLite database
│   └── temp_queue.jsonl     # Temporary queue for resilience
├── src/
│   ├── api/                 # FastAPI endpoints
│   ├── core/                # Core processing components
│   ├── models/              # Database models
│   └── utils/               # Utility functions
├── dashboard/               # Dashboard Streamlit (separado)
│   ├── app.py              # Aplicação principal
│   ├── config.py           # Configurações
│   ├── pages/              # Páginas multipágina
│   ├── components/         # Componentes reutilizáveis
│   └── utils/              # Utilitários do dashboard
├── tests/
│   ├── unit/                # Unit tests
│   ├── property/            # Property-based tests
│   └── integration/         # Integration tests
├── .kiro/specs/voz-local-pipeline/
│   ├── requirements.md      # Requisitos da feature
│   ├── design.md           # Design da feature
│   ├── tasks.md            # Plano de implementação
│   └── PROGRESS.md         # Tracking de progresso
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment variables
├── requirements.txt         # Python dependencies
└── README-pipeline.md      # This file
```

## Executar

### API (FastAPI)

```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### Dashboard (Streamlit)

```bash
streamlit run dashboard/app.py
```

## Testes

### Executar todos os testes

```bash
pytest
```

### Executar testes de propriedade

```bash
pytest tests/property/
```

### Executar testes unitários

```bash
pytest tests/unit/
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL do banco de dados SQLite | `sqlite:///data/voz_local.db` |
| `OPENAI_API_KEY` | Chave da API OpenAI | - |
| `LOG_LEVEL` | Nível de log | `INFO` |
| `RETRY_MAX_ATTEMPTS` | Máximo de tentativas de retry | `3` |
| `RETRY_BACKOFF_BASE` | Base do backoff exponencial | `1.0` |
| `ENCRYPTION_KEY` | Chave de criptografia Fernet | - |
| `DASHBOARD_UPDATE_INTERVAL` | Intervalo de atualização do dashboard (segundos) | `5` |
| `API_HOST` | Host da API | `0.0.0.0` |
| `API_PORT` | Porta da API | `8000` |

## Endpoints da API

### POST /api/v1/interactions
Registra interações dos cidadãos (opiniões sobre PLs)

### POST /api/v1/proposals
Registra propostas de pauta dos cidadãos

### GET /api/v1/metrics/lacuna
Retorna métricas de lacuna legislativa

## Desenvolvimento

### Adicionar nova dependência

```bash
uv pip install <package>
uv pip freeze > requirements.txt
```

### Executar testes com cobertura

```bash
pytest --cov=src tests/
```

## Licença

MIT
