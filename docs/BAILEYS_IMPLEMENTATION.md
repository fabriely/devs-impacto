## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     WhatsApp Web                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ WebSocket
                     │
┌────────────────────▼────────────────────────────────────┐
│              WhatsAppService (Baileys)                  │
│  - Gerencia conexão                                     │
│  - Processa eventos                                     │
│  - LID Mapping                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Event Emitter
                     │
┌────────────────────▼────────────────────────────────────┐
│          BaileysWhatsAppController                      │
│  - Gerencia sessões de usuários                        │
│  - Orquestra fluxo de conversação                      │
│  - Processa mensagens de texto e áudio                 │
└────────────────────┬────────────────────────────────────┘
                     │
           ┌─────────┴─────────┐
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│  OpenAI Service  │  │  Camera Service  │
│  - Resumir PLs   │  │  - Buscar PLs    │
│  - Responder Q&A │  │  - Dados Câmara  │
│  - TTS/STT       │  │                  │
└──────────────────┘  └──────────────────┘
```

---

## 🔧 Componentes Principais

### 1. WhatsAppService (`src/services/whatsapp.service.ts`)

Serviço singleton que gerencia a conexão com o WhatsApp.

**Responsabilidades:**
- Inicializar socket do WhatsApp
- Gerenciar autenticação e QR Code
- Processar eventos (mensagens, conexão, LID mapping)
- Enviar mensagens de texto e áudio
- Converter LID ↔ PN (Phone Number)

**Principais Métodos:**

```typescript
// Inicia o serviço
await whatsappService.start();

// Envia mensagem de texto
await whatsappService.sendText(jid, 'Olá!');

// Envia áudio
await whatsappService.sendAudio(jid, audioBuffer);

// Converte LID para número real
const pn = await whatsappService.getPNForLID(lid);

// Registra handler de mensagens
whatsappService.onMessage(async (msg) => {
  // Processa mensagem
});
```

**Eventos Emitidos:**

- `connected` - WhatsApp conectado com sucesso
- `disconnected` - WhatsApp desconectado (logout)
- `connecting` - Tentando conectar
- `qr` - QR Code disponível para escanear
- `lid-mapping-update` - Atualização no mapeamento LID/PN

### 2. BaileysWhatsAppController (`src/controllers/BaileysWhatsAppController.ts`)

Controller que gerencia a lógica de conversação com os usuários.

**Responsabilidades:**
- Processar mensagens recebidas (texto e áudio)
- Gerenciar máquina de estados das conversas
- Integrar com OpenAI para IA
- Orquestrar fluxo completo de interação

**Estados da Conversação:**

```typescript
type SessionStep = 
  | 'idle'              // Menu principal
  | 'waiting_question'  // Aguardando pergunta sobre PL
  | 'waiting_opinion';  // Aguardando opinião sobre PL
```

### 3. OpenAIService (`src/services/openai.service.ts`)

Integração com OpenAI para funcionalidades de IA.

**Funcionalidades:**

```typescript
// Resumir Projeto de Lei
const summary = await openaiService.summarizePL(plText, plNumber);

// Responder perguntas
const answer = await openaiService.answerQuestion(summary, question);

// Transcrever áudio (Whisper)
const text = await openaiService.transcribeAudio(audioBuffer, 'audio.ogg');

// Gerar áudio (TTS)
const audioBuffer = await openaiService.generateAudio(text);
```

---

## 💬 Fluxo de Conversação

### Estado: `idle` (Menu Principal)

```
Usuário: "Oi" / "Menu" / "Início"
Bot: Envia menu de boas-vindas

Opções:
  1️⃣ Ver novo PL → vai para waiting_question
  2️⃣ Fazer pergunta sobre PL → pede para ver PL primeiro
  3️⃣ Registrar opinião → pede para ver PL primeiro
  4️⃣ Ver dashboard → em breve
```

### Estado: `waiting_question` (Após Ver PL)

```
Bot: Envia resumo do PL
Bot: "Quer ouvir em áudio? 1️⃣ Sim / 2️⃣ Não ou faça uma pergunta"

Opções:
  "1" → Gera e envia áudio do resumo
  "2" → Pergunta se tem dúvidas
  Qualquer texto → Responde a pergunta via GPT → vai para waiting_opinion
```

### Estado: `waiting_opinion` (Após Responder Pergunta)

```
Bot: "Quer registrar sua opinião?"
  👍 A favor
  👎 Contra
  ⏭️ Pular

Usuário responde → Registra opinião → volta para idle (menu)
```

### Diagrama do Fluxo

```
┌─────────┐
│  idle   │◄─────────────────────────────────┐
└────┬────┘                                   │
     │                                        │
     │ "1" (Ver PL)                          │
     │                                        │
     ▼                                        │
┌──────────────────┐                         │
│ waiting_question │                         │
└────┬─────────────┘                         │
     │                                        │
     │ Pergunta ou "1"/"2"                   │
     │                                        │
     ▼                                        │
┌──────────────────┐                         │
│ waiting_opinion  │                         │
└────┬─────────────┘                         │
     │                                        │
     │ Registra opinião                      │
     │                                        │
     └────────────────────────────────────────┘
```

---

## 🗂️ Gerenciamento de Sessões

As sessões são armazenadas em memória usando um `Map`:

```typescript
interface WhatsAppSession {
  step: 'idle' | 'waiting_question' | 'waiting_opinion';
  plSummary?: string;  // Resumo do PL atual
  plNumber?: string;   // Número do PL (ex: "PL 1234/2025")
}

const userSessions = new Map<string, WhatsAppSession>();
```

**Chave da Sessão:** 
- Número de telefone (PN) convertido de LID, se aplicável
- Formato: `5511999999999` (sem `@s.whatsapp.net`)

**Importante:** A conversão LID → PN é feita de forma consistente em todos os pontos do código para garantir que a mesma chave seja usada.

---

## 🤖 Integração com OpenAI

### Modelos Utilizados

| Funcionalidade | Modelo | Custo Aprox. |
|----------------|--------|--------------|
| Resumir PL | `gpt-4o-mini` | Baixo |
| Responder Perguntas | `gpt-4o-mini` | Baixo |
| Transcrever Áudio | `whisper-1` | $0.006/min |
| Gerar Áudio | `tts-1` (voz: nova) | $0.015/1K chars |

--- 

## 🔌 Endpoints da API

### 1. GET `/api/baileys/status`

Verifica status da conexão do WhatsApp.

**Resposta:**
```json
{
  "connected": true,
  "message": "Conectado"
}
```

### 2. GET `/api/baileys/qr`

Obtém QR Code para autenticação.

**Resposta (não conectado):**
```json
{
  "qr": "base64_qr_code_string"
}
```

**Resposta (já conectado):**
```json
{
  "connected": true,
  "message": "WhatsApp já está conectado"
}
```

### 3. POST `/api/baileys/send-message`

Envia mensagem de teste manualmente.

**Body:**
```json
{
  "to": "5511999999999",
  "text": "Mensagem de teste"
}
```

Ou:

```json
{
  "number": "5511999999999@s.whatsapp.net",
  "message": "Mensagem de teste"
}
```

**Resposta:**
```json
{
  "message": "Mensagem enviada com sucesso!"
}
```

### 4. POST `/api/baileys/send-pl`

Envia resumo de PL para um número.

**Body:**
```json
{
  "to": "5511999999999"
}
```

**Resposta:**
```json
{
  "message": "PL enviado com sucesso!"
}
```

---

## 🧪 Como Testar

### 1. Iniciar o Servidor

```bash
# Com Docker
docker compose up build --volumes --watch

# Ou local
pnpm dev
```

Escaneie o QR Code com seu WhatsApp (WhatsApp → Menu → Aparelhos Conectados → Conectar Aparelho).

### 4. Testar Fluxo Completo via WhatsApp

1. Envie "Oi" para o bot
2. Bot responde com menu
3. Envie "1" para ver um PL
4. Bot envia resumo e pergunta se quer áudio
5. Envie "1" para ouvir áudio OU faça uma pergunta
6. Bot responde e pergunta sua opinião
7. Responda "a favor", "contra" ou "pular"
8. Bot agradece e volta ao menu

### 5. Testar via API

```bash
# Enviar mensagem
curl -X POST http://localhost:3001/api/baileys/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999",
    "text": "Teste via API"
  }'

# Enviar PL
curl -X POST http://localhost:3001/api/baileys/send-pl \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999"
  }'
```

---

### Problema: Bot responde com menu repetidamente

**Causa:** Sessão não está sendo mantida corretamente (chave inconsistente).

**Solução:**
- Verifique se a conversão LID → PN está consistente
- Confira logs: `🧠 Estado da sessão: [estado]`
- Limpe sessões: reinicie o servidor


## 📚 Referências

- [Baileys Documentation](https://baileys.wiki/docs/socket/connecting)
- [Baileys v7.0.0 Migration Guide](https://baileys.wiki/docs/migration/to-v7.0.0/#lids)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [WhatsApp Web Protocol](https://github.com/sigalor/whatsapp-web-reveng)
