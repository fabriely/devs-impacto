# 🔗 Integração WhatsApp ↔ Dashboard Voz.Local

## 📊 **Como funciona a integração**

A integração entre o bot do WhatsApp e o dashboard foi implementada através de um **serviço de integração** que captura e persiste **TODAS as interações** dos cidadãos em tempo real.

---

## 🏗️ **Arquitetura da Integração**

```
┌─────────────────────────────────────────────────────────────┐
│                    CIDADÃO (WhatsApp)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Baileys WhatsApp Service   │
         │  (src/services/whatsapp)    │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ BaileysWhatsAppController   │
         │  (processa mensagens)       │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ WhatsApp Integration Service│ ← ⭐ NOVO!
         │ (captura e salva dados)     │
         └─────────────┬───────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌─────────────┐
│ Processor   │ │Classifier│ │  Calculator │
│  Service    │ │ Service  │ │   Service   │
└─────────────┘ └──────────┘ └─────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              ┌─────────────────┐
              │ PostgreSQL DB   │
              │  (via Prisma)   │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Dashboard     │
              │  (visualização) │
              └─────────────────┘
```

---

## 📦 **Dados Capturados**

### **1. Cidadãos** (`cidadaos`)
Criados automaticamente na primeira interação:
- ✅ `telefone_hash` - Hash SHA-256 do número (LGPD)
- ✅ `cidade` - Extraída do DDD
- ✅ `grupo_inclusao` - Opcional (pode ser perguntado depois)
- ✅ `created_at` / `updated_at`

### **2. Interações** (`interacoes`)
Registradas em tempo real:
- ✅ **Visualização de PL**: Quando cidadão lê resumo de um PL
- ✅ **Opinião sobre PL**: `a_favor`, `contra` ou `pular`
- ✅ **Perguntas**: Dúvidas sobre PLs específicos
- ✅ **Navegação**: Acesso ao menu, comandos, etc

Campos:
```typescript
{
  cidadao_id: number,
  tipo_interacao: 'opiniao' | 'visualizacao' | 'reacao',
  opiniao?: 'a_favor' | 'contra' | 'pular',
  conteudo: string,
  metadata: {
    pl_numero?: string,
    origem: 'whatsapp',
    ...
  },
  timestamp: Date
}
```

### **3. Propostas Cidadãs** (`propostas_pauta`)
Quando cidadão enviar sugestões (texto ou áudio):
- ✅ `conteudo` - Texto da proposta (ou transcrição)
- ✅ `tipo_conteudo` - `texto` ou `audio_transcrito`
- ✅ `tema_principal` - Classificado automaticamente com GPT-4
- ✅ `temas_secundarios` - Temas relacionados
- ✅ `confidence_score` - Confiança da classificação AI
- ✅ `cidade` - Cidade do cidadão
- ✅ `grupo_inclusao` - Se informado

---

## 🔌 **Pontos de Integração no Controller**

### **1️⃣ Visualização de PL**
```typescript
// Em: sendPLSummary()
await whatsappIntegration.trackPLVisualization({
  phoneNumber,
  plNumber,
  userName,
});
```

### **2️⃣ Opinião sobre PL**
```typescript
// Em: handleOpinion()
await whatsappIntegration.trackPLOpinion({
  phoneNumber,
  plNumber,
  opinion: 'a_favor' | 'contra' | 'pular',
});
```

### **3️⃣ Pergunta sobre PL**
```typescript
// Em: handleQuestion()
await whatsappIntegration.trackPLQuestion({
  phoneNumber,
  plNumber,
  question,
});
```

### **4️⃣ Proposta Cidadã** (A implementar)
```typescript
// Quando cidadão enviar sugestão de lei
await whatsappIntegration.processCitizenProposal({
  phoneNumber,
  content: transcription || text,
  isAudioTranscription: true/false,
  audioUrl: 's3://...',
  userName,
});
```

---

## 🎯 **Funcionalidades Implementadas**

### ✅ **WhatsApp Integration Service**
Arquivo: `src/services/whatsapp-integration.service.ts`

**Métodos:**
1. `ensureCitizen()` - Cria/obtém cidadão automaticamente
2. `trackPLVisualization()` - Registra visualização
3. `trackPLOpinion()` - Registra opinião
4. `trackPLQuestion()` - Registra pergunta
5. `processCitizenProposal()` - Processa e classifica proposta
6. `trackGeneralInteraction()` - Registra navegação
7. `getCitizenStats()` - Obtém estatísticas do cidadão

**Features:**
- 🔐 Hash SHA-256 de telefones (LGPD)
- 🗺️ Detecção automática de cidade por DDD
- 🤖 Classificação AI automática de propostas
- 📊 Todos os dados disponíveis para dashboard
- ⚡ Processamento assíncrono (não bloqueia bot)

---

## 📊 **Dashboard: Dados Disponíveis**

### **Métricas em Tempo Real**

#### **1. Lacunas Legislativas**
```bash
GET /api/metrics/lacuna/theme
GET /api/metrics/lacuna/city
GET /api/metrics/lacuna/group
```

**Cálculo:**
```
Lacuna = (demandas_cidadãos - pls_tramitação) / demandas_cidadãos * 100
```

**Exemplo de resposta:**
```json
{
  "tema": "Saúde",
  "demandasCidadaos": 150,
  "plsTramitacao": 45,
  "percentualLacuna": 70.0,
  "classificacao": "Alta Lacuna"
}
```

#### **2. Engajamento Cidadão**
```bash
GET /api/metrics/summary
```

Retorna:
- Total de cidadãos engajados
- Total de interações
- Total de propostas enviadas
- Cidades atingidas
- Lacuna geral do sistema

#### **3. Propostas Populares**
```bash
GET /api/processor/proposals?limit=10&orderBy=engagement
```

Propostas mais populares por:
- Tema
- Cidade
- Grupo de inclusão

---

## 🚀 **Como Adicionar Nova Integração**

### **Exemplo: Registrar quando cidadão compartilha PL**

**1. Adicionar método no `whatsapp-integration.service.ts`:**
```typescript
async trackPLShare(data: {
  phoneNumber: string;
  plNumber: string;
  platform: 'whatsapp' | 'facebook' | 'twitter';
}): Promise<void> {
  const cidadaoId = await this.ensureCitizen(data.phoneNumber);
  
  await dataProcessor.processInteraction({
    cidadaoId,
    tipoInteracao: 'reacao',
    conteudo: `Compartilhou PL ${data.plNumber}`,
    metadata: {
      pl_numero: data.plNumber,
      platform: data.platform,
      tipo: 'compartilhamento',
    },
    timestamp: new Date(),
  });
}
```

**2. Chamar no controller:**
```typescript
// Em BaileysWhatsAppController.ts
await whatsappIntegration.trackPLShare({
  phoneNumber,
  plNumber: session.plNumber,
  platform: 'whatsapp',
});
```

**3. Criar endpoint para dashboard:**
```typescript
// Em MetricsRoutes.ts
router.get('/engagement/shares', async (req, res) => {
  const shares = await prisma.$queryRaw`
    SELECT pl_numero, COUNT(*) as count
    FROM interacoes
    WHERE metadata->>'tipo' = 'compartilhamento'
    GROUP BY pl_numero
    ORDER BY count DESC
    LIMIT 10
  `;
  
  res.json({ success: true, data: shares });
});
```

---

## 📈 **Métricas de Engajamento**

### **KPIs Principais**

1. **Taxa de Visualização → Opinião**
   ```sql
   SELECT 
     COUNT(DISTINCT CASE WHEN tipo = 'visualizacao' THEN cidadao_id END) as views,
     COUNT(DISTINCT CASE WHEN tipo = 'opiniao' THEN cidadao_id END) as opinions,
     (opinions::float / views * 100) as conversion_rate
   FROM interacoes;
   ```

2. **Propostas por Tema**
   ```sql
   SELECT tema_principal, COUNT(*) as total
   FROM propostas_pauta
   GROUP BY tema_principal
   ORDER BY total DESC;
   ```

3. **Engajamento por Cidade**
   ```sql
   SELECT cidade, 
     COUNT(DISTINCT cidadao_id) as cidadaos,
     COUNT(*) as interacoes
   FROM interacoes i
   JOIN cidadaos c ON c.id = i.cidadao_id
   GROUP BY cidade;
   ```

---

## 🎨 **Visualizações Sugeridas para Dashboard**

### **1. Lacuna Legislativa (Gráfico de Barras)**
```
Saúde        ████████████████████ 70%
Educação     ████████████ 45%
Segurança    █████████████████ 65%
```

### **2. Mapa de Calor - Engajamento por Cidade**
```
    🗺️ Brasil
São Paulo    ████ 450 cidadãos
Rio de Janeiro ███ 320 cidadãos
Belo Horizonte ██ 180 cidadãos
```

### **3. Timeline de Propostas**
```
23/11 │ ████████ 24 propostas (Saúde)
22/11 │ ██████ 18 propostas (Educação)
21/11 │ ███████ 21 propostas (Transporte)
```

### **4. Nuvem de Palavras**
Top palavras das propostas:
```
    educação  saúde
  transporte      segurança
      moradia   emprego
```

---

## 🔒 **Segurança e LGPD**

### **Dados Anonimizados:**
- ✅ Telefones são hasheados (SHA-256)
- ✅ Nomes de usuários NÃO são salvos
- ✅ Apenas dados agregados no dashboard
- ✅ Impossível rastrear indivíduo específico

### **Consentimento:**
- ℹ️ Informar ao cidadão que dados são coletados
- ℹ️ Explicar finalidade (dashboard público)
- ℹ️ Permitir opt-out

---

## 📝 **TODOs / Melhorias Futuras**

### **Alta Prioridade:**
- [ ] Adicionar funcionalidade "Enviar Proposta" no menu do bot
- [ ] Implementar webhook para receber PLs da API da Câmara
- [ ] Criar endpoint para listar propostas mais recentes
- [ ] Adicionar cache Redis para métricas
- [ ] Implementar rate limiting nas APIs

### **Média Prioridade:**
- [ ] Melhorar detecção de cidade (perguntar ao usuário)
- [ ] Adicionar campo `grupo_inclusao` no fluxo
- [ ] Criar API para buscar PLs similares a propostas
- [ ] Implementar notificações quando PL relacionado for votado
- [ ] Dashboard público com Next.js

### **Baixa Prioridade:**
- [ ] Export de dados para CSV
- [ ] Gráficos avançados (D3.js)
- [ ] Integração com redes sociais
- [ ] Gamificação (pontos por participação)

---

## 🧪 **Como Testar a Integração**

### **1. Testar Visualização:**
```bash
# Enviar mensagem para o bot
> menu
> 1  # Ver novo PL

# Verificar no banco:
psql -d devs-impacto
SELECT * FROM interacoes WHERE tipo_interacao = 'visualizacao' ORDER BY created_at DESC LIMIT 1;
```

### **2. Testar Opinião:**
```bash
# No WhatsApp:
> a favor

# Verificar:
SELECT * FROM interacoes WHERE tipo_interacao = 'opiniao' AND opiniao = 'a_favor';
```

### **3. Testar Métricas:**
```bash
curl http://localhost:3001/api/metrics/summary | jq
```

---

## 📚 **Referências**

- [Prisma Docs](https://www.prisma.io/docs)
- [Baileys WhatsApp Library](https://baileys.wiki)
- [OpenAI API](https://platform.openai.com/docs)
- [Express.js](https://expressjs.com)

---

**Documentação atualizada em:** 23 de novembro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ Integração Implementada e Funcional
