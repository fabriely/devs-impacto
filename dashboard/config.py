"""Configuração do dashboard Streamlit."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Dashboard
DASHBOARD_TITLE = "Voz.Local - Dashboard de Accountability Legislativo"
DASHBOARD_ICON = "📊"
DASHBOARD_LAYOUT = "wide"

# Configurações de atualização
UPDATE_INTERVAL = int(os.getenv("DASHBOARD_UPDATE_INTERVAL", "5"))

# Configurações do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/voz_local.db")

# Configurações de visualização
CHART_HEIGHT = 400
MAP_HEIGHT = 500

# Temas disponíveis
TEMAS = [
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
]

# Grupos de inclusão
GRUPOS_INCLUSAO = [
    "Mulheres",
    "PCDs",
    "LGBTQIA+",
    "Idosos",
    "Jovens",
    "Outros"
]

# Cores para gráficos
COLOR_PALETTE = {
    "primary": "#1f77b4",
    "secondary": "#ff7f0e",
    "success": "#2ca02c",
    "danger": "#d62728",
    "warning": "#ff9800",
    "info": "#17a2b8"
}

# Classificação de lacuna
LACUNA_THRESHOLDS = {
    "alta": 70,
    "media": 40,
    "baixa": 0
}
