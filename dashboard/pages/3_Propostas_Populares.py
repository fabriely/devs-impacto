"""
Dashboard Propostas Populares

Exibe os temas de propostas mais recorrentes e oferece insights sobre
demandas cidadãs por tema, grupo e cidade.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from config import COLOR_PALETTE


@st.cache_data(ttl=5)
def fetch_propostas():
    """Busca propostas populares da API (cache de 5 segundos)."""
    try:
        # TODO: Implementar endpoint GET /api/v1/propostas/populares
        # Por enquanto, retorna dados mockados
        return {
            "por_tema": [
                {"tema": "Saúde", "quantidade": 145, "percentual": 28.5},
                {"tema": "Educação", "quantidade": 120, "percentual": 23.6},
                {"tema": "Segurança", "quantidade": 95, "percentual": 18.7},
                {"tema": "Transporte", "quantidade": 78, "percentual": 15.4},
                {"tema": "Infraestrutura", "quantidade": 50, "percentual": 9.8},
                {"tema": "Outros", "quantidade": 20, "percentual": 3.9}
            ],
            "por_grupo": [
                {"grupo": "Mulheres", "quantidade": 180, "percentual": 45.2},
                {"grupo": "PCDs", "quantidade": 95, "percentual": 23.8},
                {"grupo": "LGBTQIA+", "quantidade": 75, "percentual": 18.8},
                {"grupo": "Idosos", "quantidade": 45, "percentual": 11.3},
                {"grupo": "Jovens", "quantidade": 2, "percentual": 0.5}
            ],
            "por_cidade": [
                {"cidade": "João Pessoa", "quantidade": 250, "percentual": 49.2},
                {"cidade": "Campina Grande", "quantidade": 180, "percentual": 35.4},
                {"cidade": "Patos", "quantidade": 65, "percentual": 12.8},
                {"cidade": "Outras", "quantidade": 13, "percentual": 2.6}
            ]
        }
    except Exception as e:
        st.error(f"Erro ao buscar propostas: {e}")
        return None


@st.cache_data(ttl=5)
def fetch_propostas_recentes():
    """Busca as propostas mais recentes."""
    try:
        # TODO: Implementar endpoint GET /api/v1/propostas/recentes?limit=10
        # Por enquanto, retorna dados mockados
        return [
            {
                "proposta_id": 1001,
                "tema": "Saúde",
                "conteudo": "Criar programa de vacinação descentralizado nas periferias",
                "grupo": "Mulheres",
                "cidade": "João Pessoa",
                "data": "2025-11-22",
                "interacoes": 12
            },
            {
                "proposta_id": 1000,
                "tema": "Educação",
                "conteudo": "Melhorar qualidade do ensino público com investimento em infraestrutura",
                "grupo": "Jovens",
                "cidade": "Campina Grande",
                "data": "2025-11-21",
                "interacoes": 8
            },
            {
                "proposta_id": 999,
                "tema": "Segurança",
                "conteudo": "Aumentar número de policiamento comunitário nas ruas",
                "grupo": "PCDs",
                "cidade": "João Pessoa",
                "data": "2025-11-21",
                "interacoes": 5
            }
        ]
    except Exception as e:
        st.error(f"Erro ao buscar propostas recentes: {e}")
        return None


def main():
    """Renderiza a página de Propostas Populares."""
    
    st.set_page_config(
        page_title="Propostas - Dashboard Voz.Local",
        page_icon="💡",
        layout="wide"
    )
    
    st.title("💡 Propostas Populares")
    
    st.markdown("""
    Análise das demandas mais frequentes dos cidadãos.
    
    As propostas que mais aparecem indicam onde o povo quer ver mudanças.
    """)
    
    # Busca dados
    propostas = fetch_propostas()
    
    if propostas:
        # Abas para diferentes visualizações
        tab1, tab2, tab3, tab4 = st.tabs(
            ["📊 Resumo", "📚 Por Tema", "👥 Por Grupo", "🗺️ Por Cidade"]
        )
        
        # ABA 1: Resumo
        with tab1:
            st.subheader("Resumo das Propostas")
            
            # Estatísticas
            total_propostas = sum([item['quantidade'] for item in propostas['por_tema']])
            tema_top = propostas['por_tema'][0] if propostas['por_tema'] else None
            grupo_top = propostas['por_grupo'][0] if propostas['por_grupo'] else None
            cidade_top = propostas['por_cidade'][0] if propostas['por_cidade'] else None
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    label="📋 Total de Propostas",
                    value=total_propostas
                )
            
            with col2:
                st.metric(
                    label="📚 Tema Principal",
                    value=tema_top['tema'] if tema_top else "N/A"
                )
            
            with col3:
                st.metric(
                    label="👥 Grupo Mais Ativo",
                    value=grupo_top['grupo'] if grupo_top else "N/A"
                )
            
            with col4:
                st.metric(
                    label="🗺️ Cidade Líder",
                    value=cidade_top['cidade'] if cidade_top else "N/A"
                )
            
            st.divider()
            
            # Propostas recentes
            st.subheader("📋 Propostas Mais Recentes")
            
            recentes = fetch_propostas_recentes()
            if recentes:
                for prop in recentes:
                    with st.container(border=True):
                        col_prop = st.columns([3, 1, 1])
                        
                        with col_prop[0]:
                            st.markdown(f"**{prop['tema']}** - {prop['conteudo'][:80]}...")
                            st.caption(
                                f"👤 {prop['grupo']} | 📍 {prop['cidade']} | "
                                f"📅 {prop['data']} | 💬 {prop['interacoes']} reações"
                            )
                        
                        with col_prop[1]:
                            st.write(f"ID: {prop['proposta_id']}")
                        
                        with col_prop[2]:
                            if st.button("Ver detalhes", key=f"prop_{prop['proposta_id']}"):
                                st.info(f"Detalhes da proposta {prop['proposta_id']} em desenvolvimento")
        
        # ABA 2: Por Tema
        with tab2:
            st.subheader("Distribuição de Propostas por Tema")
            
            df_tema = pd.DataFrame(propostas['por_tema'])
            
            if not df_tema.empty:
                # Gráfico pizza
                fig = px.pie(
                    df_tema,
                    values='quantidade',
                    names='tema',
                    title='Propostas por Tema',
                    color_discrete_sequence=px.colors.qualitative.Set3
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela
                st.subheader("Detalhes")
                
                df_tema_sorted = df_tema.sort_values('quantidade', ascending=False)
                
                for idx, row in df_tema_sorted.iterrows():
                    col = st.columns([2, 1, 1])
                    
                    with col[0]:
                        # Barra de progresso
                        st.write(row['tema'])
                        st.progress(row['percentual'] / 100)
                    
                    with col[1]:
                        st.metric(label="Quantidade", value=int(row['quantidade']))
                    
                    with col[2]:
                        st.metric(label="Percentual", value=f"{row['percentual']:.1f}%")
            else:
                st.info("Nenhuma proposta por tema disponível")
        
        # ABA 3: Por Grupo
        with tab3:
            st.subheader("Distribuição de Propostas por Grupo de Inclusão")
            
            df_grupo = pd.DataFrame(propostas['por_grupo'])
            
            if not df_grupo.empty:
                # Gráfico pizza
                fig = px.pie(
                    df_grupo,
                    values='quantidade',
                    names='grupo',
                    title='Propostas por Grupo',
                    color_discrete_sequence=px.colors.qualitative.Pastel
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela com detalhes
                st.subheader("Participação por Grupo")
                st.dataframe(
                    df_grupo.sort_values('quantidade', ascending=False),
                    use_container_width=True
                )
            else:
                st.info("Nenhuma proposta por grupo disponível")
        
        # ABA 4: Por Cidade
        with tab4:
            st.subheader("Distribuição de Propostas por Cidade")
            
            df_cidade = pd.DataFrame(propostas['por_cidade'])
            
            if not df_cidade.empty:
                # Gráfico barras horizontal
                df_cidade_sorted = df_cidade.sort_values('quantidade', ascending=True)
                
                fig = px.barh(
                    df_cidade_sorted,
                    x='quantidade',
                    y='cidade',
                    title='Propostas por Cidade',
                    labels={'quantidade': 'Quantidade', 'cidade': 'Cidade'},
                    color='quantidade',
                    color_continuous_scale='Viridis'
                )
                
                st.plotly_chart(fig, use_container_width=True, height=400)
                
                # Tabela
                st.subheader("Detalhes por Cidade")
                st.dataframe(
                    df_cidade.sort_values('quantidade', ascending=False),
                    use_container_width=True
                )
            else:
                st.info("Nenhuma proposta por cidade disponível")
        
        # Insights e recomendações
        st.divider()
        st.subheader("💡 Insights e Recomendações")
        
        if tema_top:
            st.markdown(f"""
            **Tema Prioritário**: {tema_top['tema']} ({tema_top['percentual']:.1f}% das propostas)
            
            Recomendação: Foco em políticas relacionadas a {tema_top['tema'].lower()} pode gerar
            maior engajamento e satisfação cidadã.
            """)
        
        if grupo_top:
            st.markdown(f"""
            **Grupo Mais Engajado**: {grupo_top['grupo']} ({grupo_top['percentual']:.1f}%)
            
            Recomendação: Criar ações específicas para {grupo_top['grupo'].lower()} pode ampliar
            ainda mais a participação.
            """)
    
    else:
        st.error("❌ Não foi possível carregar as propostas")
        st.info("💡 Verifique se a API FastAPI está ativa em http://localhost:8000")


if __name__ == "__main__":
    main()
