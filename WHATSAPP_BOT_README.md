# Integração WhatsApp Bot com OpenAI

Este módulo integra o WhatsApp (via Evolution API) com OpenAI para criar um bot que:
- Recebe mensagens de texto e áudio
- Transcreve áudios usando Whisper
- Gera resumos de PLs usando GPT-4
- Responde perguntas sobre PLs
- Gera áudios com TTS
- Registra opiniões dos cidadãos

## 🚀 Configuração

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx  # Obtenha em https://platform.openai.com/api-keys

# Evolution API (WhatsApp)
EVOLUTION_API_URL=http://evolution_api:3001
EVOLUTION_API_KEY=sua_chave_aqui
EVOLUTION_INSTANCE_NAME=sua_instancia
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Webhook no Evolution API

Acesse a interface da Evolution API e configure o webhook para:

**URL:** `http://seu-servidor:3001/whatsapp/webhook`

**Eventos para ouvir:**
- MESSAGES_UPSERT
- MESSAGES_UPDATE

## 📡 Endpoints

### Webhook (recebe mensagens do WhatsApp)
```
POST /whatsapp/webhook
```

### Teste: Enviar mensagem
```bash
curl -X POST http://localhost:3001/whatsapp/test/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste."
  }'
```

### Teste: Enviar PL
```bash
curl -X POST http://localhost:3001/whatsapp/test/send-pl \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999"
  }'
```

## 🎯 Fluxo de Conversação

1. **Cidadão envia mensagem** (texto ou áudio)
   - Se for áudio, o bot transcreve usando Whisper

2. **Bot responde com menu**
   ```
   1️⃣ Ver novo PL
   2️⃣ Fazer pergunta sobre PL
   3️⃣ Registrar opinião
   4️⃣ Ver dashboard público
   ```

3. **Cidadão escolhe ver PL**
   - Bot busca PL da API da Câmara (ainda a implementar)
   - OpenAI gera resumo simplificado
   - Bot envia resumo
   - Bot oferece enviar áudio do resumo

4. **Cidadão pode fazer perguntas**
   - Por texto ou áudio
   - Bot responde usando GPT-4

5. **Bot pergunta opinião**
   ```
   👍 A favor
   👎 Contra
   ⏭️ Pular
   ```

6. **Opinião é registrada** (ainda a implementar integração com banco)

## 🏗️ Arquitetura

```
src/
├── services/
│   ├── openai.service.ts       # Integração com OpenAI
│   └── evolution.service.ts    # Integração com Evolution API
├── controllers/
│   └── WhatsAppBotController.ts # Lógica do bot
└── routes/
    └── WhatsAppBotRoutes.ts    # Rotas HTTP
```

## 🔧 Serviços

### OpenAI Service

```typescript
// Gera resumo de PL
await openaiService.summarizePL(plText, plNumber);

// Responde pergunta sobre PL
await openaiService.answerQuestion(plSummary, question);

// Transcreve áudio
await openaiService.transcribeAudio(audioBuffer, filename);

// Gera áudio (TTS)
await openaiService.generateAudio(text);
```

### Evolution Service

```typescript
// Envia mensagem de texto
await evolutionService.sendTextMessage({ number, text });

// Envia áudio
await evolutionService.sendAudioMessage({ number, audioBuffer, filename });

// Baixa áudio de mensagem
await evolutionService.downloadAudio(url);
```

## 📝 TODO

- [ ] Integrar API da Câmara dos Deputados
- [ ] Salvar opiniões no banco de dados
- [ ] Adicionar autenticação Gov.br
- [ ] Criar dashboard público
- [ ] Implementar sistema de notificações para novos PLs
- [ ] Adicionar testes unitários
- [ ] Adicionar rate limiting
- [ ] Implementar Redis para sessões (ao invés de Map em memória)
- [ ] Melhorar tratamento de erros
- [ ] Adicionar logs estruturados

## 🧪 Como Testar

### 1. Teste Local (sem WhatsApp)

```bash
# Iniciar servidor
pnpm dev

# Em outro terminal, testar endpoint
curl -X POST http://localhost:3001/whatsapp/test/send-pl \
  -H "Content-Type: application/json" \
  -d '{"number": "5511999999999"}'
```

### 2. Teste com WhatsApp Real

1. Configure sua instância do Evolution API
2. Conecte um número de WhatsApp
3. Configure o webhook apontando para seu servidor
4. Envie uma mensagem para o número conectado

## 💡 Dicas

### Custos da OpenAI

- **GPT-4o-mini**: ~$0.15 por 1M tokens de entrada, ~$0.60 por 1M tokens de saída
- **Whisper**: ~$0.006 por minuto de áudio
- **TTS**: ~$15 por 1M caracteres

Para desenvolvimento, comece com GPT-4o-mini que é mais barato.

### Formato de Números

O bot aceita números em vários formatos:
- `11999999999`
- `5511999999999`
- `+55 11 99999-9999`

Ele normaliza automaticamente para o formato do WhatsApp.

## 🐛 Debug

Para ver logs detalhados, os serviços fazem `console.error` em caso de erro.

Em produção, recomenda-se usar um sistema de logs estruturados como Winston (já está no projeto).

## 📚 Recursos

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Evolution API Docs](https://doc.evolution-api.com/)
- [API Dados Abertos Câmara](https://dadosabertos.camara.leg.br/swagger/api.html)
- [e-Democracia](https://edemocracia.camara.leg.br/)
