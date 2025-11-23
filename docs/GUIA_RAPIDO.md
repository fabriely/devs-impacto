# 🚀 Guia Rápido de Início - Voz.Local

## ⚡ Setup em 5 Minutos

### 1. Clone e Instale
```bash
git clone <repo-url>
cd devs-impacto
pnpm install
cd dashboard && npm install
```

### 2. Configure Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```bash
# PostgreSQL
DATABASE_URL="postgresql://postgres:docker@localhost:5432/devs-impacto"

# OpenAI (obrigatório)
OPENAI_API_KEY="sk-..."

# Twitter (opcional)
TWITTER_API_KEY="..."
TWITTER_API_SECRET="..."
TWITTER_ACCESS_TOKEN="..."
TWITTER_ACCESS_TOKEN_SECRET="..."

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### 3. Inicie Banco de Dados
```bash
# Com Docker
docker-compose up -d postgres redis

# OU instale localmente PostgreSQL e Redis
```

### 4. Execute Migrations
```bash
pnpm migration
```

### 5. Seed Dados (Opcional)
```bash
pnpm seed
```

### 6. Inicie o Backend
```bash
pnpm dev
```

Backend roda em: http://localhost:3001

### 7. Inicie o Dashboard (nova aba do terminal)
```bash
cd dashboard
npm run dev
```

Dashboard roda em: http://localhost:3000

---

## 🎯 Primeiros Passos

### 1. Verificar Status
```bash
curl http://localhost:3001/api/health
```

### 2. Ver Métricas
```bash
curl http://localhost:3001/api/metrics/summary
```

### 3. Classificar Proposta
```bash
curl -X POST http://localhost:3001/api/classifier/theme \
  -H "Content-Type: application/json" \
  -d '{"conteudo": "Precisamos de mais escolas"}'
```

### 4. Acessar Dashboard
Abra: http://localhost:3000

---

## 📱 WhatsApp Bot

### 1. Obter QR Code
```bash
curl http://localhost:3001/api/baileys/qr
```

### 2. Escanear com WhatsApp
- Abra WhatsApp no celular
- Vá em Configurações → Aparelhos Conectados
- Escaneia o QR Code

### 3. Enviar Mensagem Teste
```bash
curl -X POST http://localhost:3001/api/baileys/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5581999999999",
    "message": "Olá do Voz.Local!"
  }'
```

---

## 🐦 Twitter (Opcional)

### 1. Verificar Status
```bash
curl http://localhost:3001/api/twitter/status
```

### 2. Publicar Tweet Teste
```bash
curl -X POST http://localhost:3001/api/twitter/tweet/pl/1
```

---

## 🎓 Próximos Passos

1. **Leia a documentação completa**: [DOCUMENTACAO_COMPLETA.md](./DOCUMENTACAO_COMPLETA.md)
2. **Veja exemplos de API**: [API_EXAMPLES.md](../API_EXAMPLES.md)
3. **Configure Twitter**: [INTEGRACAO_TWITTER.md](./INTEGRACAO_TWITTER.md)
4. **Execute curadoria de PLs**:
   ```bash
   curl -X POST http://localhost:3001/api/pls/cron/run-curation
   ```

---

## 🐛 Problemas Comuns

### Erro: "Database connection failed"
**Solução:** Verifique se PostgreSQL está rodando e DATABASE_URL está correto

### Erro: "OpenAI API key not found"
**Solução:** Configure OPENAI_API_KEY no .env

### Erro: "Redis connection failed"
**Solução:** Inicie Redis com `docker-compose up -d redis`

### Porta 3001 já em uso
**Solução:** Mude SERVER_PORT no .env ou mate o processo usando a porta

---

## 📚 Documentação

- [Documentação Completa](./DOCUMENTACAO_COMPLETA.md)
- [Integração Twitter](./INTEGRACAO_TWITTER.md)
- [API Examples](../API_EXAMPLES.md)
- [README Principal](../README.md)

---

Pronto! Seu ambiente está configurado! 🎉
