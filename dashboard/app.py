"""
Aplicação principal do Dashboard Voz.Local.

Este dashboard visualiza métricas de accountability legislativo e lacunas
entre demandas cidadãs e pautas em tramitação.
"""
import streamlit as st
from config import (
    DASHBOARD_TITLE,
    DASHBOARD_ICON,
    DASHBOARD_LAYOUT,
    UPDATE_INTERVAL
)


def main():
    """Função principal do dashboard."""
    # Configuração da página
    st.set_page_config(
        page_title=DASHBOARD_TITLE,
        page_icon=DASHBOARD_ICON,
        layout=DASHBOARD_LAYOUT,
        initial_sidebar_state="expanded"
    )
    
    # Título principal
    st.title(f"{DASHBOARD_ICON} {DASHBOARD_TITLE}")
    
    # Mensagem temporária
    st.info("""
    🚧 **Dashboard em construção**
    
    Este dashboard será implementado na Task 11 do plano de implementação.
    
    **Páginas planejadas:**
    - 🏠 Home: KPIs gerais
    - 📊 Lacunas Legislativas: Visualização de lacunas por tema, grupo e cidade
    - 📝 Propostas Populares: Propostas mais recorrentes
    - 🗺️ Mapa de Engajamento: Visualização geográfica
    """)
    
    # Sidebar
    with st.sidebar:
        st.header("Navegação")
        st.info("As páginas serão adicionadas conforme a implementação avança.")
        
        st.header("Sobre")
        st.markdown("""
        **Voz.Local** é uma plataforma de engajamento cidadão que democratiza
        o acesso à informação legislativa e captura demandas da população.
        
        Este dashboard evidencia a **Métrica de Lacuna Legislativa** - a diferença
        entre o que o povo demanda e o que o Legislativo tramita.
        """)
    
    # Auto-refresh (será implementado depois)
    st.caption(f"🔄 Auto-refresh configurado para {UPDATE_INTERVAL} segundos")


if __name__ == "__main__":
    main()
