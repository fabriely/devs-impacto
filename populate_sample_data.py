"""
Script to populate sample data for testing the dashboard.
"""

from datetime import datetime, timedelta
import random
from src.core.database_init import init_database
from src.models.database import Cidadao, ProjetoLei, Interacao, PropostaPauta
import json

# Initialize database
engine, Session = init_database()
session = Session()

# Sample data - Foco em regiões do Nordeste e grupos socialmente excluídos
CIDADES = [
    # Nordeste (maioria)
    "Salvador", "Fortaleza", "Recife", "São Luís", "Maceió", 
    "Natal", "João Pessoa", "Aracaju", "Teresina",
    # Outras regiões
    "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília"
]

GRUPOS = [
    "Mulheres", "PCDs", "LGBTQIA+", "Idosos", 
    "População Negra", "Indígenas", "Moradores de Periferia",
    "Trabalhadores Informais", "Mães Solo"
]

TEMAS = ["Saúde", "Educação", "Transporte", "Segurança", "Meio Ambiente", "Habitação"]

PROPOSTAS_EXEMPLO = [
    ("Saúde", "Precisamos de mais postos de saúde no bairro"),
    ("Saúde", "Faltam médicos nos hospitais públicos"),
    ("Educação", "Precisamos de mais creches na região"),
    ("Educação", "Escolas precisam de reforma urgente"),
    ("Transporte", "Falta ônibus no horário de pico"),
    ("Transporte", "Precisamos de mais linhas de metrô"),
    ("Segurança", "Iluminação pública precária aumenta insegurança"),
    ("Meio Ambiente", "Falta coleta seletiva de lixo"),
    ("Habitação", "Precisamos de mais moradias populares"),
]

print("🔄 Populando banco de dados com dados de exemplo...")

# Create citizens - Mais foco em Nordeste e grupos excluídos
print("👥 Criando cidadãos...")
cidadaos = []
for i in range(100):  # Aumentado para 100
    # 70% dos cidadãos do Nordeste
    if i < 70:
        cidade = random.choice(CIDADES[:9])  # Cidades do Nordeste
    else:
        cidade = random.choice(CIDADES)
    
    cidadao = Cidadao(
        telefone_hash=f"hash_{i:04d}",
        cidade=cidade,
        grupo_inclusao=random.choice(GRUPOS),
        temas_interesse=json.dumps(random.sample(TEMAS, k=random.randint(1, 3)))
    )
    session.add(cidadao)
    cidadaos.append(cidadao)

session.commit()
print(f"✅ {len(cidadaos)} cidadãos criados")

# Create PLs
print("📜 Criando Projetos de Lei...")
pls = []
for i in range(15):
    pl = ProjetoLei(
        pl_id=f"PL_{2024}_{i+1:03d}",
        titulo=f"Projeto de Lei sobre {random.choice(TEMAS)}",
        resumo="Resumo do projeto de lei...",
        tema_principal=random.choice(TEMAS),
        temas_secundarios=json.dumps([]),
        cidade=random.choice(CIDADES),
        status="tramitacao",
        url_fonte=f"https://example.com/pl/{i+1}"
    )
    session.add(pl)
    pls.append(pl)

session.commit()
print(f"✅ {len(pls)} PLs criados")

# Create interactions
print("💬 Criando interações...")
for i in range(100):
    cidadao = random.choice(cidadaos)
    pl = random.choice(pls)
    
    interacao = Interacao(
        cidadao_id=cidadao.id,
        pl_id=pl.id,
        tipo_interacao="opiniao",
        opiniao=random.choice(["a_favor", "contra", "pular"]),
        conteudo="Opinião do cidadão...",
        metadata_json=json.dumps({
            "cidade": cidadao.cidade,
            "grupo_inclusao": cidadao.grupo_inclusao
        }),
        timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 30))
    )
    session.add(interacao)

session.commit()
print("✅ 100 interações criadas")

# Create proposals - Mais propostas de grupos excluídos
print("💡 Criando propostas de pauta...")
for i in range(300):  # Aumentado para 300
    cidadao = random.choice(cidadaos)
    tema, conteudo = random.choice(PROPOSTAS_EXEMPLO)
    
    proposta = PropostaPauta(
        cidadao_id=cidadao.id,
        conteudo=conteudo + f" (variação {i})",
        tipo_conteudo="texto",
        tema_principal=tema,
        temas_secundarios=json.dumps([]),
        confidence_score=random.uniform(0.7, 0.99),
        cidade=cidadao.cidade,
        grupo_inclusao=cidadao.grupo_inclusao,
        status="pendente",
        timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 30))
    )
    session.add(proposta)

session.commit()
print("✅ 200 propostas criadas")

print("\n✨ Banco de dados populado com sucesso!")
print("\n📊 Estatísticas:")
print(f"   - {len(cidadaos)} cidadãos")
print(f"   - {len(pls)} PLs em tramitação")
print(f"   - 100 interações")
print(f"   - 300 propostas de pauta")
print(f"   - 70% dos dados do Nordeste")
print(f"   - {len(GRUPOS)} grupos socialmente excluídos")
print("\n🚀 Agora você pode executar o dashboard:")
print("   streamlit run src/dashboard/app.py")
