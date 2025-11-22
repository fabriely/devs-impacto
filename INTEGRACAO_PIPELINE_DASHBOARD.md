# 📊 Integração da Pipeline com o Dashboard - Análise e Implementação

## 🎯 Objetivo
Integrar o fluxo de conversação do WhatsApp (Baileys Controller) com a pipeline de processamento de dados (FastAPI) para que os dados coletados via chat sejam automaticamente persistidos no banco de dados e refletidos no dashboard em tempo real.

---

## 🔍 Análise do Estado Atual

### 1. **Pipeline Existente (FastAPI)**
- **Arquivo**: `src/api/main.py`
- **Endpoints disponíveis**:
  - `POST /api/v1/interactions` - Registra interações (opinião, visualização, reação)
  - `POST /api/v1/proposals` - Registra propostas de pauta com classificação IA
  - `GET /api/v1/metrics/lacuna` - Retorna métricas de lacuna legislativa

### 2. **Chatbot WhatsApp (Baileys)**
- **Arquivo**: `src/controllers/BaileysWhatsAppController.ts`
- **Fluxo atual**: 
  - Recebe mensagens via WhatsApp
  - Processa com OpenAI (resumo, respostas, transcrição)
  - Mantém sessão de conversa em memória (Map)
  - **PROBLEMA**: Não persiste dados no banco de dados

### 3. **Dashboard Streamlit**
- **Arquivo**: `dashboard/app.py`
- **Estado**: Estrutura base, sem páginas implementadas
- **Necessidade**: Precisa consumir dados da API FastAPI

---

## ❌ Gap Identificado

```
┌─────────────┐
│   WhatsApp  │
│   (Baileys) │
└──────┬──────┘
       │
       │ Mensagens
       │
┌──────▼──────────────────────┐
│ BaileysWhatsAppController   │ ◄─── AQUI: Não persiste dados!
│ (Em memória)                │
└──────┬──────────────────────┘
       │
       X (Sem conexão)
       
┌──────────────────────────────┐
│   FastAPI Pipeline           │
│   (Banco de dados)           │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Dashboard Streamlit        │
│   (Sem dados)                │
└──────────────────────────────┘
```

---

## ✅ Solução: 5 Componentes Necessários

### 1. **Adaptador WhatsApp-API** (Novo)
**Arquivo**: `src/services/whatsapp_pipeline_adapter.py`

Serviço que:
- Converte eventos do WhatsApp em chamadas à API FastAPI
- Mapeia usuários WhatsApp para cidadãos no banco
- Gerencia transações entre controller TS e pipeline Python

### 2. **Integração no Controller** (Modificação)
**Arquivo**: `src/controllers/BaileysWhatsAppController.ts`

Quando a conversa progride:
- Opinião registrada → Chama `POST /api/v1/interactions`
- Proposta enviada → Chama `POST /api/v1/proposals`

### 3. **Endpoint para Buscar PLs** (Novo)
**Arquivo**: `src/api/main.py`

Necessário um novo endpoint:
- `GET /api/v1/projetos-lei/aleatorio` - Retorna um PL aleatório da Câmara/BD

### 4. **Páginas do Dashboard** (Novo)
**Arquivos**: `dashboard/pages/*.py`

Páginas a implementar:
- **Home**: KPIs gerais (total de cidadãos, interações, propostas)
- **Lacunas Legislativas**: Gráficos de lacuna por tema, grupo, cidade
- **Propostas Populares**: Temas mais recorrentes

### 5. **Sincronização em Tempo Real** (Novo)
**Arquivo**: `src/services/realtime_sync.py`

Mecanismo para:
- Dashboard buscar novos dados a cada 5 segundos (cache Streamlit)
- Atualizar métricas automaticamente

---

## 🔄 Fluxo de Integração Proposto

```
┌─────────────┐
│   WhatsApp  │
│   (Baileys) │
└──────┬──────┘
       │ Mensagem recebida
       │
┌──────▼──────────────────────┐
│ BaileysWhatsAppController   │
│ - Conversa (sessão)         │
│ - OpenAI (resumo, resposta) │
└──────┬──────────────────────┘
       │ 
       │ Ao finalizar opinião/proposta
       │
┌──────▼──────────────────────┐
│ WhatsAppPipelineAdapter     │
│ - Mapeia cidadão            │
│ - Prepara dados             │
└──────┬──────────────────────┘
       │ HTTP POST
       │
┌──────▼──────────────────────┐
│   FastAPI Pipeline          │
│ - Valida dados              │
│ - Classifica com IA         │
│ - Persiste no BD            │
└──────┬──────────────────────┘
       │ Insere/Atualiza
       │
┌──────▼──────────────────────┐
│   Banco de Dados            │
│ (SQLite/PostgreSQL)         │
└──────┬──────────────────────┘
       │ Lê a cada 5 segundos
       │
┌──────▼──────────────────────┐
│   Dashboard Streamlit       │
│ - Atualiza KPIs             │
│ - Mostra lacunas            │
│ - Reflete propostas         │
└──────────────────────────────┘
```

---

## 📋 Checklist de Implementação

- [ ] 1. Criar `src/services/whatsapp_pipeline_adapter.py`
- [ ] 2. Modificar `src/controllers/BaileysWhatsAppController.ts` para chamar adapter
- [ ] 3. Adicionar endpoint `GET /api/v1/projetos-lei/aleatorio` no FastAPI
- [ ] 4. Criar página Home no dashboard
- [ ] 5. Criar página Lacunas no dashboard
- [ ] 6. Criar página Propostas Populares no dashboard
- [ ] 7. Implementar sincronização em tempo real
- [ ] 8. Testar fluxo completo

---

## 🚀 Benefícios da Integração

✅ **Dados Persistidos**: Todas as interações salvam no BD
✅ **Dashboard Atualizado**: Métricas refletem conversas em tempo real
✅ **Análise Profunda**: Possibilita análises de tendências
✅ **Rastreabilidade**: Histórico completo de interações
✅ **Reutilização**: API pode ser usada por outras interfaces

---

## 📚 Referências

- API FastAPI: `src/api/main.py`
- Controller WhatsApp: `src/controllers/BaileysWhatsAppController.ts`
- Modelos BD: `src/models/database.py`
- Dashboard: `dashboard/app.py`
