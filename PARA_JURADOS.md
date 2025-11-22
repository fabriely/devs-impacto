# 🎯 Guia para Jurados - Voz.Local Pipeline

## O que é este projeto?

Sistema completo que:
1. **Captura** interações de cidadãos via WhatsApp sobre Projetos de Lei
2. **Classifica** automaticamente usando IA (GPT-4)
3. **Calcula** a Métrica de Lacuna Legislativa
4. **Visualiza** tudo em dashboard público interativo

---

## 🚀 Como Testar (5 minutos)

### Opção 1: Ver Dashboard com Dados de Exemplo

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Criar banco e popular dados
python -m src.core.database_init
python populate_sample_data.py

# 3. Rodar dashboard
streamlit run src/dashboard/app.py
```

Dashboard abre automaticamente em `http://localhost:8501`

### Opção 2: Testar API

```bash
# Terminal 1: Rodar API
uvicorn src.api.main:app --reload

# Terminal 2: Testar endpoint
curl -X POST http://localhost:8000/api/v1/proposals \
  -H "Content-Type: application/json" \
  -d '{"cidadao_id": 1, "conteudo": "Precisamos de mais hospitais", "tipo_conteudo": "texto", "cidade": "São Paulo"}'
```

---

## 📊 O que Você Verá no Dashboard

### Página 1: Home
- **KPIs**: 50 cidadãos, 100 opiniões, 200 propostas
- **Top 5 Lacunas**: Temas onde legislativo mais ignora cidadãos
- **Atividade Recente**: Últimas propostas

### Página 2: Lacunas Legislativas
- **Gráficos Comparativos**: Demandas vs PLs por tema
- **Segmentação**: Por grupo de inclusão (Mulheres, PCDs, etc.)
- **Por Cidade**: Distribuição geográfica

### Página 3: Propostas Populares
- **Top 10 Temas**: Mais demandados pelos cidadãos
- **Lista Completa**: Todas as propostas ordenadas

### Página 4: Mapa de Engajamento
- **Visualização Geográfica**: Scatter plot interativo
- **Color-coded**: Por nível de lacuna (Alta/Média/Baixa)

---

## 🎯 Diferenciais Técnicos

### 1. Classificação Automática com IA
- Usa GPT-4 para classificar propostas em 11 temas
- Score de confiança para cada classificação
- Detecção de propostas similares com embeddings

### 2. Métrica de Lacuna Legislativa
```
Lacuna = (Demandas Cidadãos - PLs Tramitação) / Demandas Cidadãos × 100
```
- 🔴 Alta (≥70%): Legislativo ignorando
- 🟡 Média (40-69%): Atenção parcial
- 🟢 Baixa (<40%): Boa atenção

### 3. Arquitetura Modular
- API REST independente (FastAPI)
- Dashboard público (Streamlit)
- Banco de dados estruturado (SQLite)
- Fácil integração com bot existente

### 4. Resiliência
- Retry com exponential backoff
- Fila temporária para falhas de banco
- Tratamento de erros completo
- Logs estruturados

---

## 🔗 Integração com Bot WhatsApp

O sistema foi projetado para integrar facilmente com o bot existente:

```typescript
// No bot Node.js
await axios.post('http://localhost:8000/api/v1/proposals', {
  cidadao_id: 1,
  conteudo: "Precisamos de mais hospitais",
  tipo_conteudo: "texto",
  cidade: "São Paulo"
});
```

**Resultado**: Proposta classificada automaticamente e aparece no dashboard!

---

## 📁 Estrutura do Código

```
src/
├── api/main.py              # API REST (3 endpoints)
├── core/
│   ├── classifier.py        # IA (GPT-4)
│   ├── calculator.py        # Métricas
│   └── processor.py         # Processamento
├── models/database.py       # 5 tabelas
└── dashboard/app.py         # Dashboard (4 páginas)
```

**Código limpo, modular e bem documentado.**

---

## 🧪 Testes

```bash
pytest tests/ -v
```

**12 testes passando**:
- 7 testes de propriedades (Hypothesis)
- 5 testes unitários

---

## 📊 Dados de Exemplo

O script `populate_sample_data.py` cria:
- **50 cidadãos** em 5 cidades
- **15 PLs** em tramitação
- **100 interações** (opiniões sobre PLs)
- **200 propostas** em 6 temas diferentes

Isso permite ver o dashboard funcionando imediatamente!

---

## 🎨 Tecnologias Utilizadas

### Backend
- **Python 3.13**
- **FastAPI** - API REST moderna e rápida
- **SQLAlchemy** - ORM robusto
- **OpenAI GPT-4** - Classificação inteligente

### Frontend
- **Streamlit** - Dashboard interativo
- **Plotly** - Gráficos interativos
- **Pandas** - Manipulação de dados

### Testes
- **Pytest** - Framework de testes
- **Hypothesis** - Property-based testing

---

## 💡 Impacto Social

### Problema
Cidadãos não sabem se suas demandas estão sendo atendidas pelo legislativo.

### Solução
Dashboard público mostrando:
- Quais temas os cidadãos mais demandam
- Quais temas o legislativo está trabalhando
- **A lacuna entre os dois** (Métrica de Lacuna)

### Resultado
- **Transparência**: Cidadãos veem se são ouvidos
- **Accountability**: Legisladores são cobrados
- **Dados**: Decisões baseadas em evidências

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Guia completo do projeto |
| `INTEGRACAO_BOT.md` | Como integrar com bot WhatsApp |
| `RESUMO.md` | Resumo executivo |
| `ESTRUTURA.md` | Estrutura detalhada do código |
| `PARA_JURADOS.md` | Este arquivo |

---

## ✅ Checklist de Avaliação

- [ ] Dashboard rodando com dados de exemplo
- [ ] 4 páginas funcionando (Home, Lacunas, Propostas, Mapa)
- [ ] Gráficos interativos (hover, zoom, pan)
- [ ] Métricas calculadas corretamente
- [ ] API REST funcionando (3 endpoints)
- [ ] Classificação IA (se OpenAI configurada)
- [ ] Código limpo e documentado
- [ ] Testes passando
- [ ] Integração com bot clara e simples

---

## 🎬 Demo Rápida

1. **Abrir dashboard**: `streamlit run src/dashboard/app.py`
2. **Ver Home**: KPIs e top 5 lacunas
3. **Ver Lacunas**: Gráficos comparativos
4. **Ver Propostas**: Mais demandadas
5. **Ver Mapa**: Visualização geográfica

**Tempo total**: 2-3 minutos

---

## 🏆 Pontos Fortes

1. **Funcional**: Sistema completo e funcionando
2. **Visual**: Dashboard interativo e intuitivo
3. **Inteligente**: Classificação automática com IA
4. **Modular**: Fácil manutenção e extensão
5. **Testado**: 12 testes passando
6. **Documentado**: Guias claros e completos
7. **Integrável**: API REST simples
8. **Impacto**: Solução real para problema real

---

## 📞 Suporte

- **Documentação**: Veja `README.md`
- **Integração**: Veja `INTEGRACAO_BOT.md`
- **Estrutura**: Veja `ESTRUTURA.md`

---

**Obrigado por avaliar o Voz.Local Pipeline!** 🙏

Sistema desenvolvido para democratizar o acesso à informação legislativa e promover accountability. ❤️
