# 📋 Proposals API - Documentação

API para gerenciamento e consulta de propostas de pauta enviadas por cidadãos via WhatsApp.

## Endpoints Disponíveis

### 1. GET `/api/proposals/recent`

Lista as propostas mais recentes com paginação e filtros opcionais.

**Query Parameters:**
- `limit` (number, opcional): Quantidade de resultados por página (padrão: 20)
- `offset` (number, opcional): Offset para paginação (padrão: 0)
- `tema` (string, opcional): Filtrar por tema principal
- `cidade` (string, opcional): Filtrar por cidade

**Exemplo de Request:**
```bash
curl "http://localhost:3000/api/proposals/recent?limit=10&tema=saúde&cidade=São Paulo"
```

**Exemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "conteudo": "Precisamos de mais postos de saúde na região sul",
      "temaPrincipal": "saúde",
      "temasSecundarios": ["infraestrutura", "acesso"],
      "confidenceScore": 0.89,
      "cidade": "São Paulo",
      "grupoInclusao": "PCD",
      "tipoConteudo": "texto",
      "timestamp": "2025-11-23T14:30:00Z",
      "createdAt": "2025-11-23T14:30:05Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 2. GET `/api/proposals/by-theme`

Agrupa propostas por tema principal, retornando contagem de cada tema.

**Exemplo de Request:**
```bash
curl "http://localhost:3000/api/proposals/by-theme"
```

**Exemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "tema": "saúde",
      "count": 87
    },
    {
      "tema": "educação",
      "count": 64
    },
    {
      "tema": "transporte",
      "count": 52
    }
  ]
}
```

---

### 3. GET `/api/proposals/by-city`

Agrupa propostas por cidade, retornando as top 20 cidades com mais propostas.

**Exemplo de Request:**
```bash
curl "http://localhost:3000/api/proposals/by-city"
```

**Exemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "cidade": "São Paulo",
      "count": 243
    },
    {
      "cidade": "Rio de Janeiro",
      "count": 189
    },
    {
      "cidade": "Brasília",
      "count": 156
    }
  ]
}
```

---

### 4. GET `/api/proposals/:id`

Busca uma proposta específica por ID, incluindo informações do cidadão.

**Path Parameters:**
- `id` (number, obrigatório): ID da proposta

**Exemplo de Request:**
```bash
curl "http://localhost:3000/api/proposals/42"
```

**Exemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "conteudo": "Precisamos de mais postos de saúde na região sul",
    "temaPrincipal": "saúde",
    "temasSecundarios": ["infraestrutura", "acesso"],
    "confidenceScore": 0.89,
    "cidade": "São Paulo",
    "grupoInclusao": "PCD",
    "tipoConteudo": "texto",
    "audioUrl": null,
    "timestamp": "2025-11-23T14:30:00Z",
    "createdAt": "2025-11-23T14:30:05Z",
    "cidadao": {
      "cidade": "São Paulo",
      "grupo_inclusao": "PCD",
      "created_at": "2025-10-15T08:20:00Z"
    }
  }
}
```

**Errors:**
- `400 Bad Request` - ID inválido
- `404 Not Found` - Proposta não encontrada

---

### 5. GET `/api/proposals/stats/summary`

Retorna estatísticas gerais sobre todas as propostas.

**Exemplo de Request:**
```bash
curl "http://localhost:3000/api/proposals/stats/summary"
```

**Exemplo de Response:**
```json
{
  "success": true,
  "data": {
    "total": 523,
    "typeBreakdown": {
      "texto": 412,
      "audio_transcrito": 111
    },
    "averageConfidence": 0.847
  }
}
```

---

## Tipos de Dados

### ProposalData
```typescript
{
  id: number;
  conteudo: string;
  temaPrincipal: string | null;
  temasSecundarios: string[];
  confidenceScore: number | null;
  cidade: string;
  grupoInclusao: string | null;
  tipoConteudo: 'texto' | 'audio_transcrito';
  audioUrl: string | null;
  timestamp: Date;
  createdAt: Date;
}
```

---

## Casos de Uso

### 1. Dashboard de Propostas
```javascript
// Buscar propostas recentes para exibir no feed
const response = await fetch('/api/proposals/recent?limit=20');
const { data, pagination } = await response.json();

// Carregar mais resultados (infinite scroll)
const nextPage = await fetch(`/api/proposals/recent?limit=20&offset=${pagination.offset + 20}`);
```

### 2. Análise de Temas
```javascript
// Gráfico de pizza com distribuição de temas
const response = await fetch('/api/proposals/by-theme');
const { data } = await response.json();

// Renderizar gráfico com Chart.js ou similar
const labels = data.map(item => item.tema);
const counts = data.map(item => item.count);
```

### 3. Mapa de Engajamento
```javascript
// Mapa coroplético mostrando cidades mais ativas
const response = await fetch('/api/proposals/by-city');
const { data } = await response.json();

// Renderizar mapa com intensidade baseada em count
```

### 4. Detalhes da Proposta
```javascript
// Exibir proposta completa com contexto do cidadão
const proposalId = 42;
const response = await fetch(`/api/proposals/${proposalId}`);
const { data } = await response.json();

console.log(`Proposta: ${data.conteudo}`);
console.log(`Cidadão desde: ${data.cidadao.created_at}`);
```

---

## Integração com Dashboard

Esses endpoints foram projetados para alimentar visualizações no dashboard:

1. **Feed de Propostas** - `/recent` com infinite scroll
2. **Gráfico de Temas** - `/by-theme` para donut/pie chart
3. **Mapa de Calor** - `/by-city` para geolocalização
4. **Métricas Gerais** - `/stats/summary` para KPIs
5. **Detalhes** - `/:id` para modal/página de detalhes

---

## Performance & Paginação

- Limite padrão de 20 resultados por requisição
- Índices no banco: `cidadao_id`, `tema_principal`, `cidade`, `timestamp`
- Ordenação padrão: `created_at DESC` (mais recentes primeiro)
- Use `offset` + `limit` para paginação tradicional
- Use `hasMore` flag para infinite scroll

---

## Segurança & LGPD

⚠️ **Importante**: Dados do cidadão são **anonimizados**:
- `telefone_hash`: Hash SHA-256 do telefone (não reversível)
- Nenhum dado pessoal identificável exposto
- Apenas estatísticas agregadas disponíveis publicamente

---

## Exemplos com Frontend

### React + SWR
```typescript
import useSWR from 'swr';

function ProposalsList() {
  const { data, error } = useSWR('/api/proposals/recent?limit=20', fetcher);
  
  if (error) return <div>Erro ao carregar propostas</div>;
  if (!data) return <div>Carregando...</div>;
  
  return (
    <div>
      {data.data.map(proposal => (
        <ProposalCard key={proposal.id} {...proposal} />
      ))}
    </div>
  );
}
```

### Vue 3 + Composition API
```vue
<script setup>
import { ref, onMounted } from 'vue';

const proposals = ref([]);
const loading = ref(true);

onMounted(async () => {
  const response = await fetch('/api/proposals/recent');
  const json = await response.json();
  proposals.value = json.data;
  loading.value = false;
});
</script>
```

---

## Próximos Passos

- [ ] Cache Redis para queries frequentes
- [ ] Rate limiting (ex: 100 req/min por IP)
- [ ] Filtros adicionais (data range, score mínimo)
- [ ] Busca full-text no conteúdo
- [ ] Export CSV/JSON das propostas
