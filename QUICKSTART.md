# 🚀 Guia Rápido - Voz.Local Pipeline

## Início Rápido em 3 Passos

### 1️⃣ Ativar Ambiente Virtual

**Windows:**
```bash
.venv\Scripts\activate
```

**Linux/Mac:**
```bash
source .venv/bin/activate
```

### 2️⃣ Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.example .env

# Editar .env e adicionar sua OPENAI_API_KEY
```

### 3️⃣ Verificar Instalação

```bash
python verify_setup.py
```

Você deve ver:
```
✅ All required directories exist
✅ All core dependencies are installed
✅ All required configuration files exist
✅ Setup verification complete! Environment is ready.
```

## 📂 Estrutura do Projeto

```
📦 voz-local-pipeline
├── 🐍 src/              # Código Python do pipeline
│   ├── api/            # FastAPI endpoints
│   ├── core/           # Lógica de processamento
│   ├── models/         # Modelos de banco de dados
│   └── utils/          # Utilitários
│
├── 📊 dashboard/        # Dashboard Streamlit
│   ├── app.py          # Aplicação principal
│   ├── pages/          # Páginas do dashboard
│   └── components/     # Componentes reutilizáveis
│
├── 🧪 tests/            # Testes
│   ├── unit/           # Testes unitários
│   ├── property/       # Property-based tests
│   └── integration/    # Testes de integração
│
└── 💾 data/             # Dados e banco
    ├── voz_local.db    # SQLite database (será criado)
    └── temp_queue.jsonl # Fila temporária
```

## 🎯 Próximas Tasks

Acompanhe o progresso em: `.kiro/specs/voz-local-pipeline/PROGRESS.md`

**Próxima:** Task 2 - Implementar modelos de banco de dados

## 📚 Documentação

- **Pipeline completo:** `README-pipeline.md`
- **Dashboard:** `dashboard/README.md`
- **Progresso:** `.kiro/specs/voz-local-pipeline/PROGRESS.md`
- **Design:** `.kiro/specs/voz-local-pipeline/design.md`
- **Requisitos:** `.kiro/specs/voz-local-pipeline/requirements.md`

## 🔧 Comandos Úteis

### Executar API (quando implementada)
```bash
uvicorn src.api.main:app --reload --port 8000
```

### Executar Dashboard (quando implementado)
```bash
streamlit run dashboard/app.py
```

### Executar Testes
```bash
# Todos os testes
pytest

# Apenas testes unitários
pytest tests/unit/

# Apenas testes de propriedade
pytest tests/property/

# Com cobertura
pytest --cov=src tests/
```

### Adicionar Nova Dependência
```bash
uv pip install <package>
uv pip freeze > requirements.txt
```

## ❓ Precisa de Ajuda?

1. Verifique a documentação em `README-pipeline.md`
2. Consulte o design em `.kiro/specs/voz-local-pipeline/design.md`
3. Veja os requisitos em `.kiro/specs/voz-local-pipeline/requirements.md`

## ✅ Checklist de Setup

- [x] Virtual environment criado
- [x] Dependências instaladas
- [x] Estrutura de diretórios criada
- [x] Arquivos de configuração criados
- [x] Dashboard separado configurado
- [ ] Banco de dados inicializado (Task 2)
- [ ] API implementada (Task 7)
- [ ] Dashboard implementado (Task 11)

---

**Status atual:** Setup completo ✅  
**Última atualização:** 22/11/2025
