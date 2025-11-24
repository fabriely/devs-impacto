#!/bin/bash

# Script para iniciar o Voz.Local completo (Backend + Dashboard)

echo "🚀 Iniciando Voz.Local..."
echo ""

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker Desktop."
    exit 1
fi

# Iniciar backend (Docker)
echo "📦 Iniciando backend (Node.js + PostgreSQL + Redis)..."
docker-compose up -d

# Aguardar backend iniciar
echo "⏳ Aguardando backend inicializar (10 segundos)..."
sleep 10

# Verificar se backend está rodando
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend rodando em http://localhost:3001"
else
    echo "⚠️  Backend ainda não está pronto. Aguarde mais alguns segundos..."
    sleep 5
fi

# Iniciar dashboard
echo ""
echo "🎨 Iniciando dashboard (Next.js)..."
cd dashboard

# Verificar se dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do dashboard..."
    npm install
fi

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚙️  Criando arquivo .env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
fi

# Iniciar dashboard em background
echo "🌐 Dashboard será iniciado em http://localhost:3000"
npm run dev &

# Aguardar dashboard iniciar
sleep 5

echo ""
echo "✅ Sistema completo iniciado!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API: http://localhost:3001"
echo "🏥 Health Check: http://localhost:3001/api/health"
echo ""
echo "Para parar: Ctrl+C e depois execute: docker-compose down"
echo ""

# Manter script rodando
wait
