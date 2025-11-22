# 🔗 Integração: Bot WhatsApp → Pipeline

Guia rápido para integrar o bot WhatsApp existente com o pipeline de dados.

---

## 🚀 Passo a Passo

### 1. Criar Serviço de Pipeline

Crie `src/services/pipeline.service.ts` no seu bot:

```typescript
import axios from 'axios';

const PIPELINE_API = process.env.PIPELINE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Envia proposta de pauta do cidadão
 */
export async function enviarProposta(
  cidadaoId: number,
  conteudo: string,
  cidade: string,
  grupoInclusao?: string
) {
  try {
    const response = await axios.post(`${PIPELINE_API}/proposals`, {
      cidadao_id: cidadaoId,
      conteudo: conteudo,
      tipo_conteudo: 'texto',
      cidade: cidade,
      grupo_inclusao: grupoInclusao
    });

    console.log('✅ Proposta classificada:', response.data.tema_classificado);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar proposta:', error);
    return null; // Bot continua funcionando
  }
}

/**
 * Envia opinião do cidadão sobre PL
 */
export async function enviarOpiniao(
  cidadaoId: number,
  plId: number,
  opiniao: 'a_favor' | 'contra' | 'pular',
  cidade: string
) {
  try {
    await axios.post(`${PIPELINE_API}/interactions`, {
      cidadao_id: cidadaoId,
      pl_id: plId,
      tipo_interacao: 'opiniao',
      opiniao: opiniao,
      metadata: { cidade: cidade }
    });

    console.log('✅ Opinião registrada');
  } catch (error) {
    console.error('❌ Erro ao enviar opinião:', error);
  }
}

/**
 * Registra visualização de PL
 */
export async function registrarVisualizacao(
  cidadaoId: number,
  plId: number
) {
  try {
    await axios.post(`${PIPELINE_API}/interactions`, {
      cidadao_id: cidadaoId,
      pl_id: plId,
      tipo_interacao: 'visualizacao'
    });
  } catch (error) {
    console.error('❌ Erro ao registrar visualização:', error);
  }
}
```

### 2. Adicionar ao `.env` do Bot

```env
PIPELINE_API_URL=http://localhost:8000/api/v1
```

### 3. Integrar no Controller

Edite `src/controllers/BaileysWhatsAppController.ts`:

```typescript
import { enviarProposta, enviarOpiniao, registrarVisualizacao } from '../services/pipeline.service';

// Quando cidadão envia proposta
async handlePropostaPauta(message: any, from: string) {
  const conteudo = message.text;
  const cidadao = await this.getCidadaoByTelefone(from);
  
  const resultado = await enviarProposta(
    cidadao.id,
    conteudo,
    cidadao.cidade,
    cidadao.grupoInclusao
  );
  
  if (resultado) {
    await this.sendMessage(
      from,
      `✅ Proposta registrada!\n` +
      `📋 Tema: ${resultado.tema_classificado}\n` +
      `Obrigado! 🙏`
    );
  }
}

// Quando cidadão opina sobre PL
async handleOpiniaoPL(plId: number, opiniao: string, from: string) {
  const cidadao = await this.getCidadaoByTelefone(from);
  
  await enviarOpiniao(
    cidadao.id,
    plId,
    opiniao as 'a_favor' | 'contra' | 'pular',
    cidadao.cidade
  );
}

// Quando cidadão visualiza PL
async handleVisualizacaoPL(plId: number, from: string) {
  const cidadao = await this.getCidadaoByTelefone(from);
  registrarVisualizacao(cidadao.id, plId); // Não bloqueia
}
```

---

## 🔄 Fluxo Completo

```
1. Cidadão → WhatsApp
2. Bot Baileys → Processa
3. Bot → Chama pipeline.service.ts
4. Pipeline → Classifica com IA
5. Pipeline → Salva no banco
6. Dashboard → Atualiza automaticamente
```

---

## 🧪 Testar Integração

### 1. Iniciar Pipeline

```bash
# Terminal 1: API
uvicorn src.api.main:app --reload

# Terminal 2: Dashboard
streamlit run src/dashboard/app.py
```

### 2. Testar com cURL

```bash
# Testar proposta
curl -X POST http://localhost:8000/api/v1/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "cidadao_id": 1,
    "conteudo": "Precisamos de mais creches",
    "tipo_conteudo": "texto",
    "cidade": "São Paulo"
  }'

# Testar opinião
curl -X POST http://localhost:8000/api/v1/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "cidadao_id": 1,
    "pl_id": 1,
    "tipo_interacao": "opiniao",
    "opiniao": "a_favor"
  }'
```

### 3. Verificar Dashboard

Abra `http://localhost:8501` e veja os dados atualizados!

---

## ⚠️ Tratamento de Erros

O serviço não quebra o bot se o pipeline estiver offline:

```typescript
const resultado = await enviarProposta(...);

if (resultado) {
  // Pipeline OK - mostrar tema
  await sendMessage(from, `Tema: ${resultado.tema_classificado}`);
} else {
  // Pipeline offline - continuar
  await sendMessage(from, "Proposta registrada!");
}
```

---

## 🐛 Troubleshooting

### "Connection refused"
- Verifique se pipeline está rodando: `curl http://localhost:8000/health`
- Verifique URL no `.env`

### "cidadao_id not found"
- Certifique-se que cidadão existe no banco do pipeline
- Ou crie automaticamente no primeiro uso

### Timeout
- Aumente timeout: `timeout: 30000` (30 segundos)

---

## ✅ Checklist

- [ ] `pipeline.service.ts` criado
- [ ] `PIPELINE_API_URL` no `.env`
- [ ] Pipeline rodando
- [ ] Teste com cURL funcionando
- [ ] Integração no controller
- [ ] Teste end-to-end: WhatsApp → Bot → Pipeline → Dashboard

---

**Pronto! Seu bot está integrado com o pipeline.** 🚀

Toda interação será processada, classificada e visualizada no dashboard em tempo real!
