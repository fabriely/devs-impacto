# 📊 Voz.Local Pipeline - Resumo Executivo

## O que é?

Sistema que recebe interações de cidadãos sobre PLs, classifica automaticamente com IA, e mostra tudo em um dashboard público.

---

## ⚡ Início em 3 Comandos

```bash
pip install -r requirements.txt
python -m src.core.database_init && python populate_sample_data.py
streamlit run src/dashboard/app.py
```

Dashboard abre em `http://localhost:8501`

---

## 📁 Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/api/main.py` | API REST (3 endpoints) |
| `src/dashboard/app.py` | Dashboard Streamlit (4 páginas) |
| `src/core/classifier.py` | Classificação IA (GPT-4) |
| `src/core/calculator.py` | Cálculo de métricas |
| `src/models/database.py` | 5 tabelas do banco |
| `populate_sample_data.py` | Dados de exemplo |

---

## 🔗 Integração com Bot

No seu bot Node.js:

```typescript
import axios from 'axios';

// Enviar proposta
await axios.post('http://localhost:8000/api/v1/proposals', {
  cidadao_id: 1,
  conteudo: "Precisamos de mais hospitais",
  tipo_conteudo: "texto",
  cidade: "São Paulo"
});
```

**Detalhes**: `INTEGRACAO_BOT.md`

---

## 📊 Dashboard

- **Home**: KPIs + Top 5 lacunas
- **Lacunas**: Gráficos por tema/grupo/cidade
- **Propostas**: Mais demandadas
- **Mapa**: Visualização geográfica

---

## 🎯 Métrica de Lacuna

```
Lacuna = (Demandas - PLs) / Demandas × 100
```

- 🔴 Alta (≥70%): Legislativo ignorando
- 🟡 Média (40-69%): Atenção parcial
- 🟢 Baixa (<40%): Boa atenção

---

## 📚 Documentação

- **`README.md`**: Guia completo
- **`INTEGRACAO_BOT.md`**: Integração com bot
- **`requirements.txt`**: Dependências

---

## ✅ Status

- ✅ Banco de dados (5 tabelas)
- ✅ API REST (3 endpoints)
- ✅ Classificação IA (GPT-4)
- ✅ Dashboard (4 páginas)
- ✅ Testes (12 passando)
- ✅ Dados de exemplo

**Pronto para usar!** 🎉
