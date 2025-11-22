# 🚀 Teste Rápido da Integração Dashboard + Pipeline

## ⚡ Quick Start (5 minutos)

### Terminal 1: Iniciar a API
```bash
cd c:\Users\mathe\Desktop\devs-impacto\devs-impacto
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Esperado:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

---

### Terminal 2: Iniciar o Dashboard
```bash
cd c:\Users\mathe\Desktop\devs-impacto\devs-impacto
streamlit run dashboard/app.py
```

**Esperado:**
```
You can now view your Streamlit app in your browser.
Local URL: http://localhost:8501
```

---

### Terminal 3: Testar a Integração

#### 1️⃣ Verificar se API está saudável
```bash
curl http://localhost:8000/health
```
✅ **Esperado:** `{"status":"healthy","service":"voz-local-pipeline"}`

---

#### 2️⃣ Buscar um PL aleatório (simulando WhatsApp)
```bash
curl http://localhost:8000/api/v1/projetos-lei/aleatorio
```
✅ **Esperado:** JSON com dados do PL (se houver dados no BD)

---

#### 3️⃣ Registrar uma opinião (interação)
```bash
curl -X POST http://localhost:8000/api/v1/interactions ^
  -H "Content-Type: application/json" ^
  -d "{\"cidadao_id\": 1, \"tipo_interacao\": \"opiniao\", \"opiniao\": \"a_favor\", \"pl_id\": 1}"
```
✅ **Esperado:** `{"status":"success","interacao_id":1,"message":"Interação registrada com sucesso"}`

---

#### 4️⃣ Registrar uma proposta
```bash
curl -X POST http://localhost:8000/api/v1/proposals ^
  -H "Content-Type: application/json" ^
  -d "{\"cidadao_id\": 1, \"conteudo\": \"Precisamos de mais ciclovias\", \"tipo_conteudo\": \"texto\", \"cidade\": \"São Paulo\", \"grupo_inclusao\": \"Ciclistas\"}"
```
✅ **Esperado:** `{"status":"success","proposta_id":1,"tema_classificado":"...","confidence_score":0.95}`

---

#### 5️⃣ Ver métricas de lacuna legislativa
```bash
curl http://localhost:8000/api/v1/metrics/lacuna
```
✅ **Esperado:** JSON com lacunas por tema, grupo e cidade

---

#### 6️⃣ Dashboard resumo (KPIs)
```bash
curl http://localhost:8000/api/v1/dashboard/resumo
```
✅ **Esperado:** 
```json
{
  "total_cidadaos": 1,
  "total_interacoes": 1,
  "total_propostas": 1,
  "media_engajamento": 200.0,
  "interacoes_semana": 1,
  "ultima_atualizacao": "2025-11-22T..."
}
```

---

#### 7️⃣ Tendência de interações (últimos 7 dias)
```bash
curl "http://localhost:8000/api/v1/dashboard/tendencia-interacoes?dias=7"
```
✅ **Esperado:** JSON com dados por dia

---

#### 8️⃣ Propostas populares
```bash
curl "http://localhost:8000/api/v1/dashboard/propostas-populares?limite=5"
```
✅ **Esperado:** JSON com propostas ordenadas por recência

---

## 🖥️ Visualizar no Dashboard

1. Abra o navegador em `http://localhost:8501`
2. Veja a **Página Home** com:
   - 4 KPIs principais
   - Gráfico de tendência
   - Botões para navegar

3. **Clique em "Ver Lacunas Legislativas"**
   - 3 abas: Por Tema, Por Grupo, Por Cidade
   - Gráficos interativos

4. **Clique em "Propostas Populares"**
   - Distribuição por tema, grupo e cidade
   - Lista de propostas recentes

---

## 🔄 Teste de Atualização em Tempo Real

### Como funciona:
1. **Terminal 3:** Registre uma nova interação (passo 3 acima)
2. **Dashboard:** Faça F5 (refresh)
3. **Resultado:** Os números aumentam! ✅

### Exemplo:
```bash
# Primeira vez
curl http://localhost:8000/api/v1/dashboard/resumo
# Resultado: "total_interacoes": 1

# Registre nova interação
curl -X POST http://localhost:8000/api/v1/interactions ...

# Segunda vez
curl http://localhost:8000/api/v1/dashboard/resumo
# Resultado: "total_interacoes": 2 ✅
```

---

## 📊 Estrutura de Dados Testada

### Interação
```json
{
  "cidadao_id": 1,
  "tipo_interacao": "opiniao",
  "opiniao": "a_favor",
  "pl_id": 1
}
```

### Proposta
```json
{
  "cidadao_id": 1,
  "conteudo": "Texto da proposta",
  "tipo_conteudo": "texto",
  "cidade": "São Paulo",
  "grupo_inclusao": "Mulheres"
}
```

---

## ✅ Checklist de Sucesso

```
[ ] API respondendo em http://localhost:8000/health
[ ] Dashboard carregando em http://localhost:8501
[ ] Endpoint /projetos-lei/aleatorio retorna PL
[ ] Endpoint POST /interactions registra (status 200)
[ ] Endpoint POST /proposals registra (status 200)
[ ] Endpoint /metrics/lacuna retorna métricas
[ ] Endpoint /dashboard/resumo retorna KPIs
[ ] Dashboard mostra dados após F5
[ ] Números aumentam ao registrar novos dados
```

Se todos os itens passarem ✅, a integração está funcionando! 🎉

---

## 🐛 Solução Rápida de Problemas

| Problema | Solução |
|----------|---------|
| API não responde | `Ctrl+C` no Terminal 1 e rodar novamente |
| Dashboard branco | Fazer F5 ou `streamlit cache clear` |
| Erro 404 em PL | Banco vazio (OK, é normal) |
| Erro 500 | Ver logs da API no Terminal 1 |
| Porta 8000 ocupada | `netstat -ano \| findstr :8000` e matar processo |

---

## 📍 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/api/v1/projetos-lei/aleatorio` | PL aleatório |
| POST | `/api/v1/interactions` | Registrar interação |
| POST | `/api/v1/proposals` | Registrar proposta |
| GET | `/api/v1/metrics/lacuna` | Métricas de lacuna |
| GET | `/api/v1/dashboard/resumo` | KPIs do dashboard |
| GET | `/api/v1/dashboard/tendencia-interacoes` | Tendência |
| GET | `/api/v1/dashboard/propostas-populares` | Propostas top |

---

## 🎯 Próximo Passo

Após validar tudo, integrar o **BaileysWhatsAppController** para chamar o adapter automaticamente! 🚀
