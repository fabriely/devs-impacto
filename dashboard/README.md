# Dashboard Voz.Local

Dashboard público em Streamlit para visualização de métricas de accountability legislativo e lacunas entre demandas cidadãs e pautas em tramitação.

## Estrutura

```
dashboard/
├── app.py                    # Aplicação principal do Streamlit
├── config.py                 # Configurações do dashboard
├── pages/                    # Páginas do dashboard
│   ├── 01_home.py           # Página inicial com KPIs
│   ├── 02_lacunas.py        # Visualização de lacunas legislativas
│   ├── 03_propostas.py      # Propostas populares mais recorrentes
│   └── 04_mapa.py           # Mapa de engajamento por cidade
├── components/               # Componentes reutilizáveis
│   ├── kpis.py              # Cards de KPIs
│   ├── charts.py            # Gráficos
│   └── tables.py            # Tabelas
└── utils/                    # Utilitários
    ├── database.py          # Conexão com banco de dados
    └── formatters.py        # Formatadores de dados
```

## Páginas

### 1. Home (KPIs)
- Total de cidadãos engajados
- Total de opiniões registradas
- Total de propostas de pauta
- Gráfico de engajamento ao longo do tempo

### 2. Lacunas Legislativas
- Gráfico de barras: Lacuna por tema
- Segmentação por grupo de inclusão
- Segmentação por cidade
- Tabela detalhada de métricas

### 3. Propostas Populares
- Tabela de propostas mais recorrentes
- Ordenação por volume
- Filtros por tema, cidade e grupo

### 4. Mapa de Engajamento
- Visualização geográfica
- Cidades com mais demandas vs mais PLs
- Identificação de lacunas regionais

## Executar

```bash
# Ativar ambiente virtual
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Executar dashboard
streamlit run dashboard/app.py
```

## Configuração

O dashboard usa as mesmas variáveis de ambiente do arquivo `.env`:

- `DATABASE_URL`: URL do banco de dados
- `DASHBOARD_UPDATE_INTERVAL`: Intervalo de atualização em segundos (padrão: 5)

## Auto-refresh

O dashboard é configurado para atualizar automaticamente a cada 5 segundos, garantindo que os dados mais recentes sejam sempre exibidos.

## Anonimização

Todos os dados exibidos no dashboard são anonimizados. Nenhum identificador direto de cidadãos (como telefone_hash) é exibido publicamente.
