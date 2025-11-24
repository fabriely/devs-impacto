# 📚 API Voz.Local - Exemplos de Uso

## 🎯 Endpoints Disponíveis

### **Base URL**
```
http://localhost:3001
```

---

## 1️⃣ **Métricas de Lacuna Legislativa**

### **GET /api/metrics/lacuna/theme**
Retorna lacunas legislativas por tema.

```bash
curl http://localhost:3001/api/metrics/lacuna/theme
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "tema": "Saúde",
      "demandasCidadaos": 150,
      "plsTramitacao": 45,
      "percentualLacuna": 70.0,
      "classificacao": "Alta Lacuna"
    },
    {
      "tema": "Educação",
      "demandasCidadaos": 120,
      "plsTramitacao": 80,
      "percentualLacuna": 33.33,
      "classificacao": "Baixa Lacuna"
    }
  ],
  "count": 2
}
```

---

### **GET /api/metrics/lacuna/group**
Retorna lacunas por grupo de inclusão.

```bash
curl http://localhost:3001/api/metrics/lacuna/group
```

---

### **GET /api/metrics/lacuna/city**
Retorna lacunas por cidade.

```bash
curl http://localhost:3001/api/metrics/lacuna/city
```

---

### **GET /api/metrics/summary**
Retorna estatísticas gerais.

```bash
curl http://localhost:3001/api/metrics/summary
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalDemandas": 450,
    "totalPlsTramitacao": 180,
    "percentualLacunaGeral": 60.0,
    "totalCidadaos": 1250,
    "totalCidades": 15
  }
}
```

---

## 2️⃣ **Classificação AI**

### **POST /api/classifier/theme**
Classifica o tema de uma proposta usando GPT-4.

```bash
curl -X POST http://localhost:3001/api/classifier/theme \
  -H "Content-Type: application/json" \
  -d '{
    "conteudo": "Precisamos de mais postos de saúde no bairro e melhorar o atendimento do SUS"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "temaPrincipal": "Saúde",
    "temasSecundarios": ["Infraestrutura"],
    "confidenceScore": 0.95,
    "needsReview": false
  }
}
```

---

### **POST /api/classifier/embedding**
Gera embedding vetorial para uma proposta.

```bash
curl -X POST http://localhost:3001/api/classifier/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "conteudo": "Melhorar a iluminação nas ruas do centro"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "embedding": [0.023, -0.012, 0.045, ...],
    "dimensions": 1536
  }
}
```

---

### **POST /api/classifier/batch**
Classifica múltiplas propostas em lote.

```bash
curl -X POST http://localhost:3001/api/classifier/batch \
  -H "Content-Type: application/json" \
  -d '{
    "propostas": [
      "Precisamos de mais escolas",
      "Melhorar a segurança pública",
      "Construir ciclovias"
    ]
  }'
```

---

### **POST /api/classifier/topics**
Extrai tópicos-chave de uma proposta.

```bash
curl -X POST http://localhost:3001/api/classifier/topics \
  -H "Content-Type: application/json" \
  -d '{
    "conteudo": "Queremos melhorar o transporte público com mais ônibus e metrô"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "topics": [
      "transporte público",
      "ônibus",
      "metrô",
      "mobilidade urbana"
    ],
    "count": 4
  }
}
```

---

### **GET /api/classifier/themes**
Lista todos os temas disponíveis.

```bash
curl http://localhost:3001/api/classifier/themes
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    "Saúde",
    "Educação",
    "Transporte",
    "Segurança",
    "Meio Ambiente",
    "Habitação",
    "Cultura",
    "Esporte",
    "Assistência Social",
    "Infraestrutura",
    "Outros"
  ],
  "count": 11
}
```

---

## 3️⃣ **Processamento de Dados**

### **POST /api/processor/interactions**
Processa uma interação do cidadão.

```bash
curl -X POST http://localhost:3001/api/processor/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "cidadaoId": 123,
    "tipoInteracao": "opiniao",
    "opiniao": "a_favor",
    "plId": 456,
    "conteudo": "Concordo totalmente com este projeto",
    "metadata": {
      "origem": "whatsapp",
      "sessao_id": "abc123"
    }
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 789
  },
  "message": "Interaction processed successfully"
}
```

---

### **POST /api/processor/proposals**
Processa uma proposta de cidadão (com classificação automática).

```bash
curl -X POST http://localhost:3001/api/processor/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "cidadaoId": 123,
    "conteudo": "Precisamos de mais escolas públicas de qualidade",
    "tipoConteudo": "texto",
    "cidade": "São Paulo",
    "grupoInclusao": "Mulheres",
    "autoClassify": true
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 890,
    "classification": {
      "temaPrincipal": "Educação",
      "temasSecundarios": ["Infraestrutura"],
      "confidenceScore": 0.92,
      "needsReview": false
    },
    "needsReview": false
  },
  "message": "Proposal processed successfully"
}
```

---

### **POST /api/processor/interactions/batch**
Processa múltiplas interações em lote.

```bash
curl -X POST http://localhost:3001/api/processor/interactions/batch \
  -H "Content-Type: application/json" \
  -d '{
    "interactions": [
      {
        "cidadaoId": 123,
        "tipoInteracao": "visualizacao",
        "plId": 456
      },
      {
        "cidadaoId": 124,
        "tipoInteracao": "opiniao",
        "opiniao": "contra",
        "plId": 457
      }
    ]
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "successCount": 2,
    "errorCount": 0,
    "errors": []
  },
  "message": "Processed 2 interactions, 0 failed"
}
```

---

### **POST /api/processor/citizens**
Cria ou obtém um cidadão.

```bash
curl -X POST http://localhost:3001/api/processor/citizens \
  -H "Content-Type: application/json" \
  -d '{
    "telefoneHash": "5511999999999_hash",
    "cidade": "São Paulo",
    "grupoInclusao": "PCDs"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 125,
    "created": true
  },
  "message": "Citizen created successfully"
}
```

---

### **GET /api/processor/citizens/:id/stats**
Obtém estatísticas de um cidadão.

```bash
curl http://localhost:3001/api/processor/citizens/123/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalInteracoes": 45,
    "totalPropostas": 12,
    "opinioesPorTipo": {
      "a_favor": 30,
      "contra": 10,
      "pular": 5
    }
  }
}
```

---

## 🔥 **Exemplos com JavaScript/TypeScript**

### **Usando Fetch API**

```typescript
// Classificar uma proposta
async function classificarProposta(conteudo: string) {
  const response = await fetch('http://localhost:3001/api/classifier/theme', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ conteudo }),
  });
  
  const data = await response.json();
  return data;
}

// Processar uma proposta
async function processarProposta(proposta: {
  cidadaoId: number;
  conteudo: string;
  cidade: string;
}) {
  const response = await fetch('http://localhost:3001/api/processor/proposals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...proposta,
      tipoConteudo: 'texto',
      autoClassify: true,
    }),
  });
  
  const data = await response.json();
  return data;
}

// Obter métricas de lacuna
async function obterMetricas() {
  const [porTema, porCidade, resumo] = await Promise.all([
    fetch('http://localhost:3001/api/metrics/lacuna/theme').then(r => r.json()),
    fetch('http://localhost:3001/api/metrics/lacuna/city').then(r => r.json()),
    fetch('http://localhost:3001/api/metrics/summary').then(r => r.json()),
  ]);
  
  return { porTema, porCidade, resumo };
}
```

---

### **Usando Axios**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Classificar proposta
const result = await api.post('/classifier/theme', {
  conteudo: 'Precisamos de mais áreas verdes',
});

// Processar interação
await api.post('/processor/interactions', {
  cidadaoId: 123,
  tipoInteracao: 'opiniao',
  opiniao: 'a_favor',
  plId: 456,
});

// Obter métricas
const metrics = await api.get('/metrics/summary');
```

---

## 🧪 **Testando a API**

### **Usando HTTPie**

```bash
# Classificar
http POST localhost:3001/api/classifier/theme \
  conteudo="Melhorar o transporte público"

# Métricas
http GET localhost:3001/api/metrics/summary

# Processar proposta
http POST localhost:3001/api/processor/proposals \
  cidadaoId:=123 \
  conteudo="Nova escola" \
  tipoConteudo="texto" \
  cidade="São Paulo" \
  autoClassify:=true
```

---

### **Collection Postman/Insomnia**

Importe o arquivo `voz-local-api.json` (a ser criado) com todos os endpoints pré-configurados.

---

## 🔐 **Autenticação**

⚠️ **Nota:** Atualmente a API não possui autenticação. Em produção, você deve adicionar:
- JWT tokens
- API keys
- Rate limiting
- CORS configurado adequadamente

---

## 📊 **Monitoramento**

### **Health Check**

```bash
curl http://localhost:3001/api/metrics/health
```

**Resposta:**
```json
{
  "success": true,
  "message": "Metrics service is healthy",
  "timestamp": "2025-11-23T10:30:00.000Z"
}
```

---

## 🐛 **Tratamento de Erros**

Todos os endpoints retornam erros no formato:

```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": [
    {
      "field": "conteudo",
      "message": "Conteúdo deve ter pelo menos 10 caracteres"
    }
  ]
}
```

**Códigos HTTP:**
- `200` - Sucesso
- `201` - Criado
- `400` - Erro de validação
- `500` - Erro interno do servidor

---

**Documentação gerada em:** 23 de novembro de 2025  
**Versão da API:** 1.0.0
