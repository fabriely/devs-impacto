"""
Streamlit Dashboard para Voz.Local Pipeline.

Dashboard com foco em grupos socialmente excluídos e regiões do Nordeste.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
# import folium - REMOVED
# from streamlit_folium import st_folium - REMOVED
from sqlalchemy.orm import Session
from sqlalchemy import func
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from src.core.database_init import init_database
from src.core.calculator import MetricsCalculator
from src.models.database import Cidadao, Interacao, PropostaPauta, ProjetoLei

# Coordenadas das cidades do Nordeste
COORDENADAS_CIDADES = {
    "Salvador": (-12.9714, -38.5014),
    "Fortaleza": (-3.7172, -38.5433),
    "Recife": (-8.0476, -34.8770),
    "São Luís": (-2.5307, -44.3068),
    "Maceió": (-9.6658, -35.7353),
    "Natal": (-5.7945, -35.2110),
    "João Pessoa": (-7.1195, -34.8450),
    "Aracaju": (-10.9472, -37.0731),
    "Teresina": (-5.0892, -42.8019),
    "São Paulo": (-23.5505, -46.6333),
    "Rio de Janeiro": (-22.9068, -43.1729),
    "Belo Horizonte": (-19.9167, -43.9345),
    "Brasília": (-15.7939, -47.8828)
}

# Page config
st.set_page_config(
    page_title="Voz.Local - Accountability Legislativo",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .big-metric {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
    }
    .highlight-box {
        padding: 20px;
        border-radius: 10px;
        background-color: #f0f2f6;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize database
@st.cache_resource
def get_db_session():
    engine, SessionLocal = init_database()
    return SessionLocal()

db = get_db_session()

# Sidebar
st.sidebar.title("📊 Voz.Local")
st.sidebar.markdown("### Dashboard de Accountability Legislativo")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navegação",
    ["🏠 Home", "🗺️ Mapa de Exclusão", "📉 Lacunas por Grupo", "💡 Propostas Populares"]
)

# Auto-refresh
st_autorefresh = st.sidebar.checkbox("Auto-refresh (5s)", value=False)
if st_autorefresh:
    import time
    time.sleep(5)
    st.rerun()

# Helper functions
def get_kpis():
    """Get KPI metrics."""
    total_cidadaos = db.query(func.count(Cidadao.id)).scalar() or 0
    total_opinioes = db.query(func.count(Interacao.id)).filter(
        Interacao.tipo_interacao == 'opiniao'
    ).scalar() or 0
    total_propostas = db.query(func.count(PropostaPauta.id)).scalar() or 0
    
    # Cidadãos do Nordeste
    nordeste_cities = ["Salvador", "Fortaleza", "Recife", "São Luís", "Maceió", 
                       "Natal", "João Pessoa", "Aracaju", "Teresina"]
    cidadaos_nordeste = db.query(func.count(Cidadao.id)).filter(
        Cidadao.cidade.in_(nordeste_cities)
    ).scalar() or 0
    
    return total_cidadaos, total_opinioes, total_propostas, cidadaos_nordeste


def get_propostas_por_cidade():
    """Get proposals by city with coordinates."""
    propostas = db.query(
        PropostaPauta.cidade,
        func.count(PropostaPauta.id).label('count')
    ).filter(
        PropostaPauta.cidade.isnot(None)
    ).group_by(
        PropostaPauta.cidade
    ).all()
    
    data = []
    for p in propostas:
        if p.cidade in COORDENADAS_CIDADES:
            lat, lon = COORDENADAS_CIDADES[p.cidade]
            data.append({
                'cidade': p.cidade,
                'count': p.count,
                'lat': lat,
                'lon': lon
            })
    
    return pd.DataFrame(data)


def get_lacuna_por_grupo():
    """Get lacuna by social group."""
    calculator = MetricsCalculator(db)
    return calculator.calculate_lacuna_by_group()


def get_propostas_por_grupo():
    """Get proposals by social group."""
    propostas = db.query(
        PropostaPauta.grupo_inclusao,
        func.count(PropostaPauta.id).label('count')
    ).filter(
        PropostaPauta.grupo_inclusao.isnot(None)
    ).group_by(
        PropostaPauta.grupo_inclusao
    ).order_by(
        func.count(PropostaPauta.id).desc()
    ).all()
    
    return [(p.grupo_inclusao, p.count) for p in propostas]


# PAGE: HOME
if page == "🏠 Home":
    st.title("🏠 Voz.Local - Accountability Legislativo")
    st.markdown("### Democratizando o acesso à informação e evidenciando exclusão social")
    
    # KPIs
    col1, col2, col3, col4 = st.columns(4)
    
    total_cidadaos, total_opinioes, total_propostas, cidadaos_nordeste = get_kpis()
    
    with col1:
        st.metric(
            label="👥 Cidadãos Engajados",
            value=f"{total_cidadaos:,}",
            help="Total de cidadãos que interagiram"
        )
    
    with col2:
        st.metric(
            label="💬 Opiniões",
            value=f"{total_opinioes:,}",
            help="Opiniões sobre Projetos de Lei"
        )
    
    with col3:
        st.metric(
            label="💡 Propostas",
            value=f"{total_propostas:,}",
            help="Propostas legislativas dos cidadãos"
        )
    
    with col4:
        pct_nordeste = (cidadaos_nordeste / total_cidadaos * 100) if total_cidadaos > 0 else 0
        st.metric(
            label="🌴 Nordeste",
            value=f"{pct_nordeste:.0f}%",
            help="Cidadãos do Nordeste"
        )
    
    st.markdown("---")
    
    # Destaque: Grupos Socialmente Excluídos
    st.subheader("🎯 Grupos Socialmente Excluídos Mais Ativos")
    
    propostas_grupo = get_propostas_por_grupo()
    
    if propostas_grupo:
        df_grupos = pd.DataFrame(propostas_grupo, columns=['Grupo', 'Propostas'])
        
        fig = px.bar(
            df_grupos.head(8),
            x='Propostas',
            y='Grupo',
            orientation='h',
            title="Propostas por Grupo de Inclusão",
            color='Propostas',
            color_continuous_scale='Reds',
            labels={'Propostas': 'Número de Propostas'}
        )
        fig.update_layout(height=400, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        # Destaque
        grupo_mais_ativo = propostas_grupo[0]
        st.info(f"💪 **{grupo_mais_ativo[0]}** é o grupo mais ativo com **{grupo_mais_ativo[1]} propostas**")
    
    st.markdown("---")
    
    # Lacunas Críticas
    st.subheader("🔴 Lacunas Legislativas Críticas")
    
    calculator = MetricsCalculator(db)
    lacunas_tema = calculator.calculate_lacuna_by_theme()
    
    if lacunas_tema:
        # Filtrar apenas lacunas altas
        lacunas_altas = [l for l in lacunas_tema if l['lacuna'] >= 70][:5]
        
        if lacunas_altas:
            df_lacunas = pd.DataFrame(lacunas_altas)
            
            fig = px.bar(
                df_lacunas,
                x='chave',
                y='lacuna',
                title="Top 5 Temas com Alta Lacuna (≥70%)",
                labels={'chave': 'Tema', 'lacuna': 'Lacuna (%)'},
                color='lacuna',
                color_continuous_scale='Reds'
            )
            fig.update_layout(height=350, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
            
            st.error(f"⚠️ **{len(lacunas_altas)} temas** com lacuna crítica - Legislativo ignorando demandas!")
        else:
            st.success("✅ Nenhuma lacuna crítica identificada")


# PAGE: MAPA DE EXCLUSÃO
elif page == "🗺️ Mapa de Exclusão":
    st.title("🗺️ Mapa de Exclusão Social e Demandas")
    st.markdown("### Visualização geográfica das demandas de grupos excluídos")
    
    # Filtros
    col1, col2 = st.columns([1, 3])
    
    with col1:
        st.markdown("#### Filtros")
        
        # Filtro de grupo
        grupos_disponiveis = db.query(PropostaPauta.grupo_inclusao).distinct().all()
        grupos_disponiveis = [g[0] for g in grupos_disponiveis if g[0]]
        
        grupo_selecionado = st.selectbox(
            "Grupo de Inclusão",
            ["Todos"] + grupos_disponiveis
        )
        
        # Filtro de tema
        temas_disponiveis = db.query(PropostaPauta.tema_principal).distinct().all()
        temas_disponiveis = [t[0] for t in temas_disponiveis if t[0]]
        
        tema_selecionado = st.selectbox(
            "Tema",
            ["Todos"] + temas_disponiveis
        )
    
    with col2:
        # Buscar dados filtrados
        query = db.query(
            PropostaPauta.cidade,
            PropostaPauta.grupo_inclusao,
            func.count(PropostaPauta.id).label('count')
        ).filter(
            PropostaPauta.cidade.isnot(None)
        )
        
        if grupo_selecionado != "Todos":
            query = query.filter(PropostaPauta.grupo_inclusao == grupo_selecionado)
        
        if tema_selecionado != "Todos":
            query = query.filter(PropostaPauta.tema_principal == tema_selecionado)
        
        propostas = query.group_by(
            PropostaPauta.cidade,
            PropostaPauta.grupo_inclusao
        ).all()
        
        # Criar mapa
        if propostas:
            # Criar mapa com Plotly
            df_map = pd.DataFrame([
                {
                    'Cidade': p.cidade,
                    'Grupo': p.grupo_inclusao,
                    'Propostas': p.count,
                    'lat': COORDENADAS_CIDADES[p.cidade][0],
                    'lon': COORDENADAS_CIDADES[p.cidade][1],
                    'size': p.count  # Usado para o tamanho
                }
                for p in propostas
                if p.cidade in COORDENADAS_CIDADES
            ])

            if not df_map.empty:
                fig = px.scatter_mapbox(
                    df_map,
                    lat="lat",
                    lon="lon",
                    size="Propostas",
                    color="Propostas",
                    hover_name="Cidade",
                    hover_data={"Grupo": True, "Propostas": True, "lat": False, "lon": False, "size": False},
                    color_continuous_scale=px.colors.sequential.Reds,
                    size_max=40,
                    zoom=4,
                    center={"lat": -8.0, "lon": -38.0},
                    title="Distribuição Geográfica das Demandas"
                )

                fig.update_layout(
                    mapbox_style="open-street-map",
                    height=600,
                    margin={"r":0,"t":40,"l":0,"b":0}
                )

                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("Nenhuma cidade com coordenadas encontradas para os dados filtrados.")
        else:
            st.info("Nenhum dado disponível para os filtros selecionados")
    
    st.markdown("---")
    
    # Heatmap de propostas por cidade e grupo
    st.subheader("🔥 Heatmap: Demandas por Cidade e Grupo")
    
    # Buscar dados para heatmap
    heatmap_data = db.query(
        PropostaPauta.cidade,
        PropostaPauta.grupo_inclusao,
        func.count(PropostaPauta.id).label('count')
    ).filter(
        PropostaPauta.cidade.isnot(None),
        PropostaPauta.grupo_inclusao.isnot(None)
    ).group_by(
        PropostaPauta.cidade,
        PropostaPauta.grupo_inclusao
    ).all()
    
    if heatmap_data:
        # Criar matriz para heatmap
        df_heatmap = pd.DataFrame([
            {'Cidade': h.cidade, 'Grupo': h.grupo_inclusao, 'Propostas': h.count}
            for h in heatmap_data
        ])
        
        # Pivot para heatmap
        pivot_data = df_heatmap.pivot_table(
            index='Grupo',
            columns='Cidade',
            values='Propostas',
            fill_value=0
        )
        
        fig = px.imshow(
            pivot_data,
            labels=dict(x="Cidade", y="Grupo de Inclusão", color="Propostas"),
            x=pivot_data.columns,
            y=pivot_data.index,
            color_continuous_scale='Reds',
            aspect="auto"
        )
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
        
        st.info("💡 **Células mais vermelhas** indicam maior concentração de demandas daquele grupo naquela cidade")


# PAGE: LACUNAS POR GRUPO
elif page == "📉 Lacunas por Grupo":
    st.title("📉 Lacunas Legislativas por Grupo Social")
    st.markdown("### Evidenciando a exclusão de grupos vulneráveis")
    
    lacunas_grupo = get_lacuna_por_grupo()
    
    if lacunas_grupo:
        df_grupo = pd.DataFrame(lacunas_grupo)
        
        # Gráfico principal
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            name='Demandas Cidadãos',
            x=df_grupo['chave'],
            y=df_grupo['demandas'],
            marker_color='#3498db'
        ))
        
        fig.add_trace(go.Bar(
            name='PLs em Tramitação',
            x=df_grupo['chave'],
            y=df_grupo['pls'],
            marker_color='#95a5a6'
        ))
        
        fig.update_layout(
            title="Demandas vs PLs por Grupo de Inclusão",
            xaxis_title="Grupo",
            yaxis_title="Quantidade",
            barmode='group',
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("---")
        
        # Percentual de lacuna
        st.subheader("🎯 Percentual de Lacuna por Grupo")
        
        fig2 = px.bar(
            df_grupo,
            x='chave',
            y='lacuna',
            color='classificacao',
            title="Lacuna Legislativa por Grupo (%)",
            labels={'chave': 'Grupo', 'lacuna': 'Lacuna (%)', 'classificacao': 'Classificação'},
            color_discrete_map={
                'Alta Lacuna': '#e74c3c',
                'Média Lacuna': '#f39c12',
                'Baixa Lacuna': '#27ae60'
            },
            height=400
        )
        
        st.plotly_chart(fig2, use_container_width=True)
        
        # Análise
        st.markdown("---")
        st.subheader("📊 Análise de Exclusão")
        
        grupos_alta_lacuna = df_grupo[df_grupo['lacuna'] >= 70]
        
        if len(grupos_alta_lacuna) > 0:
            st.error(f"⚠️ **{len(grupos_alta_lacuna)} grupos** com lacuna crítica (≥70%)")
            
            for _, grupo in grupos_alta_lacuna.iterrows():
                st.markdown(f"""
                <div class="highlight-box">
                    <h4>🔴 {grupo['chave']}</h4>
                    <p><strong>Demandas:</strong> {grupo['demandas']} | <strong>PLs:</strong> {grupo['pls']} | <strong>Lacuna:</strong> {grupo['lacuna']:.1f}%</p>
                    <p>Este grupo está sendo <strong>sistematicamente ignorado</strong> pelo legislativo!</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.success("✅ Nenhum grupo com lacuna crítica")
        
        # Tabela detalhada
        st.markdown("---")
        st.subheader("📋 Dados Detalhados")
        st.dataframe(df_grupo, use_container_width=True)
    else:
        st.info("Nenhum dado disponível")


# PAGE: PROPOSTAS POPULARES
elif page == "💡 Propostas Populares":
    st.title("💡 Propostas Populares por Grupo")
    st.markdown("### O que cada grupo está demandando?")
    
    # Seletor de grupo
    grupos_disponiveis = db.query(PropostaPauta.grupo_inclusao).distinct().all()
    grupos_disponiveis = [g[0] for g in grupos_disponiveis if g[0]]
    
    grupo_selecionado = st.selectbox(
        "Selecione o Grupo de Inclusão",
        ["Todos"] + grupos_disponiveis
    )
    
    # Buscar propostas
    query = db.query(
        PropostaPauta.tema_principal,
        PropostaPauta.conteudo,
        PropostaPauta.cidade,
        func.count(PropostaPauta.id).label('count')
    ).filter(
        PropostaPauta.tema_principal.isnot(None)
    )
    
    if grupo_selecionado != "Todos":
        query = query.filter(PropostaPauta.grupo_inclusao == grupo_selecionado)
        st.info(f"📊 Mostrando propostas de: **{grupo_selecionado}**")
    
    propostas = query.group_by(
        PropostaPauta.tema_principal,
        PropostaPauta.conteudo,
        PropostaPauta.cidade
    ).order_by(
        func.count(PropostaPauta.id).desc()
    ).limit(20).all()
    
    if propostas:
        # Gráfico de temas
        df_temas = pd.DataFrame([
            {'Tema': p.tema_principal, 'Frequência': p.count}
            for p in propostas
        ]).groupby('Tema').sum().reset_index().sort_values('Frequência', ascending=False)
        
        fig = px.bar(
            df_temas.head(10),
            x='Frequência',
            y='Tema',
            orientation='h',
            title=f"Top 10 Temas Mais Demandados{' - ' + grupo_selecionado if grupo_selecionado != 'Todos' else ''}",
            color='Frequência',
            color_continuous_scale='Blues'
        )
        fig.update_layout(height=400, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("---")
        
        # Lista de propostas
        st.subheader("📋 Propostas Detalhadas")
        
        df_propostas = pd.DataFrame([
            {
                'Tema': p.tema_principal,
                'Proposta': p.conteudo[:80] + '...' if len(p.conteudo) > 80 else p.conteudo,
                'Cidade': p.cidade,
                'Frequência': p.count
            }
            for p in propostas
        ])
        
        st.dataframe(df_propostas, use_container_width=True, height=400)
    else:
        st.info("Nenhuma proposta encontrada")

# Footer
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center'>
        <p><strong>Voz.Local</strong> - Democratizando o acesso à informação legislativa</p>
        <p style='font-size: 0.9em; color: gray;'>Evidenciando a exclusão de grupos socialmente vulneráveis</p>
    </div>
    """,
    unsafe_allow_html=True
)
