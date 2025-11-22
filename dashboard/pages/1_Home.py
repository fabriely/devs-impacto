"""
Dashboard Home Page - KPIs Principais

Exibe indicadores principais como total de cidadãos, interações e propostas.
"""

import streamlit as st
import pandas as pd
import requests
from datetime import datetime, timedelta
from config import DATABASE_URL

# Configuração da página
st.set_page_config(
    page_title="Home - Dashboard Voz.Local",
    page_icon="🏠",
    layout="wide"
)


@st.cache_data(ttl=5)
def fetch_metrics():
    """Busca métricas da API (cache de 5 segundos)."""
    try:
        # TODO: Implementar endpoint GET /api/v1/dashboard/resumo
        # Por enquanto, retorna dados mockados
        return {
            "total_cidadaos": 0,
            "total_interacoes": 0,
            "total_propostas": 0,
            "media_engajamento": 0.0
        }
    except Exception as e:
        st.error(f"Erro ao buscar métricas: {e}")
        return None


@st.cache_data(ttl=5)
def fetch_interactions_trend():
    """Busca tendência de interações dos últimos 7 dias."""
    try:
        # Dados mockados por enquanto
        dates = pd.date_range(end=datetime.now(), periods=7)
        values = [0] * 7
        
        return pd.DataFrame({
            'data': dates,
            'interacoes': values
        })
    except Exception as e:
        st.error(f"Erro ao buscar tendência: {e}")
        return None


def main():
    """Renderiza a página Home."""
    
    st.title("🏠 Home - Dashboard Voz.Local")
    
    st.markdown("""
    Bem-vindo ao Dashboard de Accountability Legislativo da plataforma Voz.Local!
    
    Esta página apresenta os principais indicadores de engajamento cidadão e 
    lacunas legislativas.
    """)
    
    # Busca dados
    metrics = fetch_metrics()
    
    if metrics:
        # KPIs Principais
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                label="👥 Cidadãos Ativos",
                value=metrics['total_cidadaos'],
                delta=None
            )
        
        with col2:
            st.metric(
                label="💬 Total de Interações",
                value=metrics['total_interacoes'],
                delta=None
            )
        
        with col3:
            st.metric(
                label="💡 Propostas Registradas",
                value=metrics['total_propostas'],
                delta=None
            )
        
        with col4:
            st.metric(
                label="📊 Taxa de Engajamento",
                value=f"{metrics['media_engajamento']:.1%}",
                delta=None
            )
        
        st.divider()
        
        # Gráfico de tendência
        st.subheader("📈 Tendência de Interações (Últimos 7 dias)")
        
        trend_data = fetch_interactions_trend()
        if trend_data is not None:
            st.area_chart(
                trend_data.set_index('data')['interacoes'],
                use_container_width=True,
                height=300
            )
        else:
            st.info("Aguardando dados...")
        
        st.divider()
        
        # Informações adicionais
        st.subheader("ℹ️ Sobre este Dashboard")
        
        col_info1, col_info2 = st.columns(2)
        
        with col_info1:
            st.markdown("""
            **O que é Voz.Local?**
            
            Uma plataforma que conecta cidadãos com o poder legislativo,
            permitindo que pessoas comuns participem da democracia de forma
            simples e acessível via WhatsApp.
            """)
        
        with col_info2:
            st.markdown("""
            **Métrica de Lacuna Legislativa**
            
            Mostra a diferença entre o que o povo demanda e o que o
            Legislativo está trabalhando. Lacunas altas indicam
            desconexão entre demanda cidadã e agenda legislativa.
            """)
        
        # Navegação para outras páginas
        st.divider()
        st.subheader("🔍 Explore as Análises")
        
        col_nav1, col_nav2, col_nav3 = st.columns(3)
        
        with col_nav1:
            if st.button("📊 Ver Lacunas Legislativas", use_container_width=True):
                st.switch_page("pages/2_Lacunas_Legislativas.py")
        
        with col_nav2:
            if st.button("💡 Propostas Populares", use_container_width=True):
                st.switch_page("pages/3_Propostas_Populares.py")
        
        with col_nav3:
            if st.button("🗺️ Mapa de Engajamento", use_container_width=True):
                st.info("⚠️ Página em desenvolvimento")
    
    else:
        st.error("❌ Não foi possível carregar as métricas. Verifique se a API está ativa.")
        st.info("💡 Dica: Certifique-se de que o servidor FastAPI está rodando em http://localhost:8000")


if __name__ == "__main__":
    main()
