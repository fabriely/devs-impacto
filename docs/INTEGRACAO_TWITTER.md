# 🐦 Integração com Twitter - Voz.Local

## 📋 Visão Geral

A integração com o Twitter permite que o sistema **Voz.Local** publique automaticamente tweets sobre:
- Novos Projetos de Lei (PLs) adicionados ao sistema
- Alertas de lacuna legislativa alta
- Resumos semanais de atividades
- PLs aprovados

## 🎯 Funcionalidades

### 1. **Tweet Automático de Novo PL**
Quando um novo PL é adicionado ao sistema (via webhook ou curadoria), um tweet é automaticamente publicado com:
- 🏛️ Número e título do PL
- 📝 Resumo (se couber nos 280 caracteres)
- 👤 Autores
- 🔗 Link para o PL na Câmara
- 🏷️ Hashtags: #VozLocal #Legislativo #[Tema]

**Exemplo:**
```
🏥 Novo PL em Análise!

PL 1234/2024: Amplia atendimento do SUS

Estabelece novas diretrizes para o atendimento prioritário...

👤 Dep. João Silva, Dep. Maria Santos
#VozLocal #Legislativo #Saúde
```

---

### 2. **Tweet de Lacuna Legislativa Alta**
Quando um tema atinge lacuna legislativa ≥ 70%, um tweet de alerta é publicado com:
- ⚠️ Tema com alta lacuna
- 📊 Percentual de lacuna
- 💬 Número de demandas cidadãs
- 📜 Número de PLs em tramitação
- 🏷️ Hashtags: #VozLocal #LacunaLegislativa #[Tema]

**Exemplo:**
```
🏥 Alerta de Lacuna Legislativa!

Tema: Saúde
Lacuna: 75.5%

📊 150 demandas cidadãs
📜 45 PLs em tramitação

Os cidadãos pedem mais atenção do legislativo neste tema!

#VozLocal #LacunaLegislativa #Saúde
```

---

### 3. **Resumo Semanal**
Toda segunda-feira às 10h, um resumo semanal é publicado com:
- 👥 Total de cidadãos engajados
- 💬 Total de propostas recebidas
- 📜 Total de PLs monitorados
- 🔥 Tema mais demandado
- ⚠️ Maior lacuna legislativa
- 🏷️ Hashtags: #VozLocal #Democracia #ParticipaçãoCidadã

**Exemplo:**
```
📊 Resumo Semanal - Voz.Local

👥 1,250 cidadãos engajados
💬 450 propostas recebidas
📜 180 PLs monitorados

🔥 Tema mais demandado: Saúde
⚠️ Maior lacuna: 75.5%

Conectando cidadãos ao legislativo!

#VozLocal #Democracia #ParticipaçãoCidadã
```

---

### 4. **Tweet de PL Aprovado**
Quando um PL importante é aprovado, um tweet de celebração é publicado:
- ✅ Número e título do PL aprovado
- 📊 Informação sobre demanda cidadã
- 🏷️ Hashtags: #VozLocal #PLAprovado #[Tema]

**Exemplo:**
```
✅ PL Aprovado!

PL 1234/2024: Amplia atendimento do SUS

Este projeto de lei foi aprovado e agora segue para sanção!

📊 Era uma das pautas mais demandadas pelos cidadãos.

#VozLocal #PLAprovado #Saúde
```

---

## 🔧 Configuração

### 1. **Criar Conta no Twitter Developer**

1. Acesse: https://developer.twitter.com/
2. Crie uma conta de desenvolvedor
3. Crie um novo projeto e app
4. Gere as credenciais:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret

### 2. **Configurar Variáveis de Ambiente**

Adicione no arquivo `.env`:

```bash
# Twitter/X API Configuration
TWITTER_API_KEY=your-api-key-here
TWITTER_API_SECRET=your-api-secret-here
TWITTER_ACCESS_TOKEN=your-access-token-here
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret-here
```

### 3. **Testar Conexão**

```bash
curl http://localhost:3001/api/twitter/status
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "connected": true,
    "message": "Twitter conectado e funcionando"
  }
}
```

---

## 📡 API Endpoints

### 1. **GET /api/twitter/status**
Verifica status da conexão com Twitter

**Exemplo:**
```bash
curl http://localhost:3001/api/twitter/status
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "connected": true,
    "message": "Twitter conectado e funcionando"
  }
}
```

---

### 2. **POST /api/twitter/tweet/pl/:id**
Publica tweet manualmente sobre um PL específico

**Exemplo:**
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/pl/123
```

**Resposta:**
```json
{
  "success": true,
  "message": "Tweet publicado com sucesso",
  "data": {
    "tweetId": "1234567890123456789",
    "text": "🏥 Novo PL em Análise!\n\nPL 1234/2024..."
  }
}
```

---

### 3. **POST /api/twitter/tweet/lacuna/:tema**
Publica tweet sobre lacuna legislativa de um tema

**Exemplo:**
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/lacuna/Saúde
```

**Resposta:**
```json
{
  "success": true,
  "message": "Tweet sobre lacuna publicado com sucesso",
  "data": {
    "tweetId": "1234567890123456789",
    "text": "🏥 Alerta de Lacuna Legislativa!\n\nTema: Saúde..."
  }
}
```

---

### 4. **POST /api/twitter/tweet/weekly-summary**
Publica resumo semanal

**Exemplo:**
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/weekly-summary
```

**Resposta:**
```json
{
  "success": true,
  "message": "Resumo semanal publicado com sucesso",
  "data": {
    "tweetId": "1234567890123456789",
    "text": "📊 Resumo Semanal - Voz.Local..."
  }
}
```

---

## 🤖 Automação

### Webhooks
Tweets automáticos são disparados quando:

1. **Novo PL adicionado via webhook**:
   ```
   POST /api/webhooks/camara-pls
   → Salva no banco
   → Publica tweet automaticamente
   ```

2. **Curadoria de PLs executada**:
   ```
   POST /api/pls/cron/run-curation
   → Analisa PLs relevantes
   → Publica tweets dos mais importantes
   ```

### Jobs Agendados (Cron)

O sistema já tem jobs configurados para:

1. **Resumo Semanal**:
   - Frequência: Segunda-feira às 10h
   - Função: `twitterService.tweetWeeklySummary()`

2. **Alertas de Lacuna Alta**:
   - Frequência: Diária às 18h
   - Função: Verifica temas com lacuna ≥ 70% e publica

---

## 🎨 Emojis por Tema

O sistema usa emojis específicos para cada tema:

| Tema | Emoji |
|------|-------|
| Saúde | 🏥 |
| Educação | 📚 |
| Segurança Pública | 🚨 |
| Transporte e Mobilidade | 🚌 |
| Infraestrutura Urbana | 🏗️ |
| Meio Ambiente | 🌳 |
| Cultura e Lazer | 🎭 |
| Assistência Social | 🤝 |
| Habitação | 🏠 |
| Economia e Trabalho | 💼 |
| Outros | 📋 |

---

## 🔐 Segurança

### Autenticação OAuth 1.0a
O serviço usa OAuth 1.0a com:
- HMAC-SHA1 para assinatura
- Timestamp e nonce para prevenir replay attacks
- Credenciais seguras em variáveis de ambiente

### Tratamento de Erros
- Se Twitter não configurado → Sistema continua funcionando (apenas loga)
- Se falha ao publicar → Não interrompe fluxo principal
- Logs detalhados de erros

---

## 📊 Monitoramento

### Logs
Todos os tweets são logados:
```
✅ Tweet publicado com sucesso: 1234567890123456789
📤 Publicando tweet sobre PL: PL 1234/2024
❌ Erro ao publicar tweet: [erro]
```

### Métricas
Você pode adicionar tracking de:
- Total de tweets publicados
- Engagement (likes, retweets)
- Falhas de publicação

---

## 🚀 Exemplo de Uso Completo

### 1. Configurar Twitter
```bash
# Editar .env
TWITTER_API_KEY=abc123...
TWITTER_API_SECRET=xyz789...
TWITTER_ACCESS_TOKEN=token123...
TWITTER_ACCESS_TOKEN_SECRET=secret456...
```

### 2. Testar Conexão
```bash
curl http://localhost:3001/api/twitter/status
```

### 3. Adicionar Novo PL (automaticamente publica tweet)
```bash
curl -X POST http://localhost:3001/api/webhooks/camara-pls \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: seu-signature" \
  -d '{
    "id": "2345678",
    "numero": "1234",
    "ano": "2024",
    "ementa": "Amplia atendimento do SUS",
    "temas": ["Saúde"]
  }'
```

### 4. Publicar Tweet Manualmente
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/pl/123
```

### 5. Publicar Resumo Semanal
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/weekly-summary
```

---

## 🐛 Troubleshooting

### Erro: "Twitter não configurado"
**Causa:** Variáveis de ambiente não configuradas  
**Solução:** Configure as 4 variáveis no `.env`

### Erro: "Invalid signature"
**Causa:** Credenciais incorretas  
**Solução:** Verifique API Key e Secret no Twitter Developer Portal

### Erro: "Rate limit exceeded"
**Causa:** Muitos tweets em curto período  
**Solução:** Twitter limita a 300 tweets/3h. Aguarde e tente novamente.

### Erro: "Duplicate content"
**Causa:** Tweet idêntico publicado recentemente  
**Solução:** Twitter bloqueia duplicatas. Adicione timestamp ou variação no texto.

---

## 📚 Referências

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 1.0a Specification](https://oauth.net/core/1.0a/)
- [Twitter API Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)

---

## 🤝 Contribuindo

Para adicionar novos tipos de tweets:

1. Adicione método no `twitter.service.ts`
2. Crie endpoint correspondente em `TwitterRoutes.ts`
3. Adicione chamada no local apropriado (webhook, cron, etc)
4. Atualize esta documentação

---

## 📝 Changelog

### v1.0.0 (23/11/2025)
- ✅ Implementação inicial
- ✅ Tweet de novo PL
- ✅ Tweet de lacuna legislativa
- ✅ Resumo semanal
- ✅ Tweet de PL aprovado
- ✅ API endpoints completa
- ✅ Integração com webhooks

---

**Última atualização:** 23 de novembro de 2025
