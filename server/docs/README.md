# 📚 Documentação - Voz.Local

Este diretório contém toda a documentação do projeto **Voz.Local**.

---

## 📖 Índice de Documentação

### 🚀 Começando

- **[Guia Rápido de Início](./GUIA_RAPIDO.md)** ⚡
  - Setup em 5 minutos
  - Primeiros passos
  - Troubleshooting básico

### 📘 Documentação Principal

- **[Documentação Completa](./DOCUMENTACAO_COMPLETA.md)** 📖
  - Visão geral do projeto
  - Arquitetura do sistema
  - Tecnologias utilizadas
  - Modelos de dados (Prisma)
  - Funcionalidades implementadas
  - API REST completa
  - Dashboard
  - Configuração e deploy
  - Exemplos de uso

### 🔌 Integrações

- **[Integração com Twitter](./INTEGRACAO_TWITTER.md)** 🐦
  - Publicação automática de PLs
  - Alertas de lacuna legislativa
  - Resumos semanais
  - API endpoints
  - Configuração passo a passo

### 📋 Outros Documentos

Documentos na raiz do projeto:

- **[API Examples](../API_EXAMPLES.md)** - Exemplos práticos de uso da API
- **[Para Jurados](../PARA_JURADOS.md)** - Apresentação para avaliadores
- **[README Pipeline](../README-pipeline.md)** - Pipeline de dados
- **[README Principal](../README.md)** - Visão geral e setup básico

---

## 🎯 Por Onde Começar?

### Se você é **novo no projeto**:
1. Leia o [Guia Rápido](./GUIA_RAPIDO.md) para setup inicial
2. Explore o [README Principal](../README.md) para visão geral
3. Consulte a [Documentação Completa](./DOCUMENTACAO_COMPLETA.md) quando precisar de detalhes

### Se você vai **integrar com a API**:
1. Veja [API Examples](../API_EXAMPLES.md) para exemplos prontos
2. Consulte a seção "API REST" na [Documentação Completa](./DOCUMENTACAO_COMPLETA.md)

### Se você vai **configurar Twitter**:
1. Siga o guia [Integração com Twitter](./INTEGRACAO_TWITTER.md)

### Se você é **jurado/avaliador**:
1. Leia [Para Jurados](../PARA_JURADOS.md)
2. Acesse o [Dashboard](http://localhost:3000) após setup

---

## 🏗️ Estrutura do Projeto

```
devs-impacto/
│
├── docs/                          # 📚 Toda a documentação
│   ├── README.md                  # Este arquivo
│   ├── GUIA_RAPIDO.md            # Setup rápido
│   ├── DOCUMENTACAO_COMPLETA.md  # Docs completa
│   └── INTEGRACAO_TWITTER.md     # Integração Twitter
│
├── src/                           # 🔧 Código backend
│   ├── services/                  # Serviços (WhatsApp, OpenAI, Twitter...)
│   ├── routes/                    # Rotas da API
│   ├── controllers/               # Controladores
│   └── ...
│
├── dashboard/                     # 🎨 Frontend Next.js
│   ├── app/                       # App Router
│   ├── components/                # Componentes React
│   └── lib/                       # Utilitários
│
├── prisma/                        # 💾 Schema do banco
│   └── schema.prisma              # Modelos de dados
│
└── ...
```

---

## 🤝 Contribuindo

Ao adicionar novas funcionalidades, lembre-se de:

1. ✅ Atualizar a [Documentação Completa](./DOCUMENTACAO_COMPLETA.md)
2. ✅ Adicionar exemplos em [API Examples](../API_EXAMPLES.md)
3. ✅ Criar documentação específica se for integração grande (como Twitter)
4. ✅ Atualizar este README.md se necessário

---

## 📞 Suporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/...)
- 📧 **Email**: suporte@vozlocal.com.br
- 💬 **Discord**: [Link do Discord]

---

## 📝 Changelog da Documentação

### 23/11/2025 - v1.0.0
- ✅ Documentação completa criada
- ✅ Guia rápido de início
- ✅ Integração com Twitter documentada
- ✅ Todos os endpoints da API documentados
- ✅ Exemplos de uso completos

---

**Mantenha a documentação atualizada! 📖**
