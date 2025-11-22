"""
Dashboard Lacunas Legislativas

Exibe gráficos de lacunas legislativas (gap entre demanda cidadã e agenda legislativa)
por tema, grupo de inclusão e cidade.
"""

import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from config import TEMAS, GRUPOS_INCLUSAO, LACUNA_THRESHOLDS, COLOR_PALETTE


@st.cache_data(ttl=5)
def fetch_lacunas():
    """Busca métricas de lacuna da API (cache de 5 segundos)."""
    try:
        # TODO: Conectar com API real
        # response = requests.get("http://localhost:8000/api/v1/metrics/lacuna")
        # return response.json()
        
        # Dados mockados por enquanto
        return {
            "lacunas_por_tema": [
                {
                    "tema": "Saúde",
                    "demandas_cidadaos": 150,
                    "pls_tramitacao": 5,
                    "percentual_lacuna": 96.67,
                    "classificacao": "Alta Lacuna"
                },
                {
                    "tema": "Educação",
                    "demandas_cidadaos": 120,
                    "pls_tramitacao": 12,
                    "percentual_lacuna": 90.0,
                    "classificacao": "Alta Lacuna"
                },
                {
                    "tema": "Transporte",
                    "demandas_cidadaos": 80,
                    "pls_tramitacao": 15,
                    "percentual_lacuna": 81.25,
                    "classificacao": "Alta Lacuna"
                }
            ],
            "lacunas_por_grupo": [
                {
                    "grupo": "Mulheres",
                    "demandas_cidadaos": 45,
                    "pls_tramitacao": 2,
                    "percentual_lacuna": 95.56,
                    "classificacao": "Alta Lacuna"
                },
                {
                    "grupo": "PCDs",
                    "demandas_cidadaos": 30,
                    "pls_tramitacao": 1,
                    "percentual_lacuna": 96.67,
                    "classificacao": "Alta Lacuna"
                }
            ],
            "lacunas_por_cidade": [
                {
                    "cidade": "João Pessoa",
                    "demandas_cidadaos": 95,
                    "pls_tramitacao": 8,
                    "percentual_lacuna": 91.58,
                    "classificacao": "Alta Lacuna"
                },
                {
                    "cidade": "Campina Grande",
                    "demandas_cidadaos": 50,
                    "pls_tramitacao": 5,
                    "percentual_lacuna": 90.0,
                    "classificacao": "Alta Lacuna"
                }
            ]
        }
    except Exception as e:
        st.error(f"Erro ao buscar lacunas: {e}")
        return None


def get_color_by_classification(classificacao: str) -> str:
    """Retorna cor baseada na classificação de lacuna."""
    if "Alta" in classificacao:
        return COLOR_PALETTE["danger"]
    elif "Média" in classificacao:
        return COLOR_PALETTE["warning"]
    else:
        return COLOR_PALETTE["success"]


def main():
    """Renderiza a página de Lacunas Legislativas."""
    
    st.set_page_config(
        page_title="Lacunas - Dashboard Voz.Local",
        page_icon="📊",
        layout="wide"
    )
    
    st.title("📊 Lacunas Legislativas")
    
    st.markdown("""
    A **Lacuna Legislativa** representa a diferença entre o que os cidadãos demandam
    e o que o Legislativo está trabalhando.
    
    **Fórmula**: (Demandas Cidadãs - PLs em Tramitação) / Demandas Cidadãs × 100
    
    - 🔴 **Alta Lacuna** (≥70%): Desconexão significativa
    - 🟠 **Média Lacuna** (40-70%): Lacuna moderada
    - 🟢 **Baixa Lacuna** (<40%): Bom alinhamento
    """)
    
    # Busca dados
    lacunas = fetch_lacunas()
    
    if lacunas:
        # Abas para diferentes visualizações
        tab1, tab2, tab3 = st.tabs(["📚 Por Tema", "👥 Por Grupo", "🗺️ Por Cidade"])
        
        # ABA 1: Por Tema
        with tab1:
            st.subheader("Lacunas por Tema")
            
            lacunas_tema_df = pd.DataFrame(lacunas["lacunas_por_tema"])
            
            if not lacunas_tema_df.empty:
                # Ordena por percentual_lacuna decrescente
                lacunas_tema_df = lacunas_tema_df.sort_values("percentual_lacuna", ascending=True)
                
                # Gráfico horizontal (barras)
                fig = px.bar(
                    lacunas_tema_df,
                    x="percentual_lacuna",
                    y="tema",
                    orientation="h",
                    title="Percentual de Lacuna por Tema",
                    labels={
                        "percentual_lacuna": "Lacuna (%)",
                        "tema": "Tema"
                    },
                    color="percentual_lacuna",
                    color_continuous_scale=["green", "orange", "red"],
                    range_color=[0, 100]
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela detalhada
                st.subheader("Detalhes por Tema")
                
                col_display_tema = st.columns([1, 1, 1, 1, 1])
                with col_display_tema[0]:
                    st.write("**Tema**")
                with col_display_tema[1]:
                    st.write("**Demandas**")
                with col_display_tema[2]:
                    st.write("**PLs**")
                with col_display_tema[3]:
                    st.write("**Lacuna %**")
                with col_display_tema[4]:
                    st.write("**Status**")
                
                st.divider()
                
                for _, row in lacunas_tema_df.iterrows():
                    col_tema = st.columns([1, 1, 1, 1, 1])
                    
                    with col_tema[0]:
                        st.write(row['tema'])
                    with col_tema[1]:
                        st.write(str(row['demandas_cidadaos']))
                    with col_tema[2]:
                        st.write(str(row['pls_tramitacao']))
                    with col_tema[3]:
                        st.write(f"{row['percentual_lacuna']:.1f}%")
                    with col_tema[4]:
                        # Emoji baseado na classificação
                        if "Alta" in row['classificacao']:
                            st.write("🔴 Alta")
                        elif "Média" in row['classificacao']:
                            st.write("🟠 Média")
                        else:
                            st.write("🟢 Baixa")
            else:
                st.info("Nenhum dado disponível para temas")
        
        # ABA 2: Por Grupo
        with tab2:
            st.subheader("Lacunas por Grupo de Inclusão")
            
            lacunas_grupo_df = pd.DataFrame(lacunas["lacunas_por_grupo"])
            
            if not lacunas_grupo_df.empty:
                lacunas_grupo_df = lacunas_grupo_df.sort_values("percentual_lacuna", ascending=True)
                
                fig = px.bar(
                    lacunas_grupo_df,
                    x="percentual_lacuna",
                    y="grupo",
                    orientation="h",
                    title="Percentual de Lacuna por Grupo",
                    labels={
                        "percentual_lacuna": "Lacuna (%)",
                        "grupo": "Grupo"
                    },
                    color="percentual_lacuna",
                    color_continuous_scale=["green", "orange", "red"],
                    range_color=[0, 100]
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela
                st.dataframe(lacunas_grupo_df, use_container_width=True)
            else:
                st.info("Nenhum dado disponível para grupos")
        
        # ABA 3: Por Cidade
        with tab3:
            st.subheader("Lacunas por Cidade")
            
            lacunas_cidade_df = pd.DataFrame(lacunas["lacunas_por_cidade"])
            
            if not lacunas_cidade_df.empty:
                lacunas_cidade_df = lacunas_cidade_df.sort_values("percentual_lacuna", ascending=True)
                
                fig = px.bar(
                    lacunas_cidade_df,
                    x="percentual_lacuna",
                    y="cidade",
                    orientation="h",
                    title="Percentual de Lacuna por Cidade",
                    labels={
                        "percentual_lacuna": "Lacuna (%)",
                        "cidade": "Cidade"
                    },
                    color="percentual_lacuna",
                    color_continuous_scale=["green", "orange", "red"],
                    range_color=[0, 100]
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela
                st.dataframe(lacunas_cidade_df, use_container_width=True)
            else:
                st.info("Nenhum dado disponível para cidades")
        
        # Legenda de interpretação
        st.divider()
        st.subheader("📖 Como Interpretar")
        
        col_legend1, col_legend2, col_legend3 = st.columns(3)
        
        with col_legend1:
            st.markdown("""
            **🔴 Alta Lacuna (≥70%)**
            
            Significa que há muita demanda de cidadãos
            sobre um tema, mas poucos PLs em tramitação.
            
            **Ação**: Oportunidade de propor novas leis
            nesta área.
            """)
        
        with col_legend2:
            st.markdown("""
            **🟠 Média Lacuna (40-70%)**
            
            Existe alinhamento parcial entre o que
            o povo quer e o que o Legislativo trabalha.
            
            **Ação**: Acompanhar PLs em andamento
            e solicitar acelerações.
            """)
        
        with col_legend3:
            st.markdown("""
            **🟢 Baixa Lacuna (<40%)**
            
            Bom alinhamento entre demanda cidadã
            e agenda legislativa.
            
            **Ação**: Manter e aproveitar para
            participar nas discussões.
            """)
    
    else:
        st.error("❌ Não foi possível carregar as métricas de lacuna")
        st.info("💡 Verifique se a API FastAPI está ativa em http://localhost:8000")


if __name__ == "__main__":
    main()
