#!/usr/bin/env python
"""
Script de teste rápido da integração Dashboard + Pipeline

Execute com: python test_integration_quick.py
"""

import requests
import json
import time
from datetime import datetime

# Cores para terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

API_URL = "http://localhost:8000"

def print_header(text):
    """Imprime header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*50}{Colors.END}\n")

def print_success(text):
    """Imprime sucesso"""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    """Imprime erro"""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    """Imprime info"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def print_json(data):
    """Imprime JSON formatado"""
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_health_check():
    """Testa health check"""
    print_header("1️⃣ HEALTH CHECK")
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"API respondendo: {data['status']}")
            print_json(data)
            return True
        else:
            print_error(f"Status inesperado: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Não consegui conectar em {API_URL}")
        print_info("Certifique-se de rodar: python -m uvicorn src.api.main:app --reload")
        return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_random_pl():
    """Testa busca de PL aleatório"""
    print_header("2️⃣ BUSCAR PL ALEATÓRIO")
    
    try:
        response = requests.get(f"{API_URL}/api/v1/projetos-lei/aleatorio", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"PL encontrado: {data['pl_id']}")
            print(f"Título: {data['titulo'][:60]}...")
            print(f"Tema: {data['tema_principal']}")
            return True, data
        elif response.status_code == 404:
            print_info("Nenhum PL no banco de dados (é normal na primeira vez)")
            return False, None
        else:
            print_error(f"Status: {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Erro: {e}")
        return False, None

def test_register_interaction(pl_id=1):
    """Testa registrar interação"""
    print_header("3️⃣ REGISTRAR INTERAÇÃO (OPINIÃO)")
    
    payload = {
        "cidadao_id": 1,
        "tipo_interacao": "opiniao",
        "opiniao": "a_favor",
        "pl_id": pl_id,
        "conteudo": "Excelente proposta para melhorar a educação!"
    }
    
    try:
        print_info(f"Enviando: {json.dumps(payload, ensure_ascii=False)}")
        response = requests.post(
            f"{API_URL}/api/v1/interactions",
            json=payload,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Interação registrada: ID {data['interacao_id']}")
            print_json(data)
            return True
        else:
            print_error(f"Status: {response.status_code}")
            print_json(response.json())
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_register_proposal():
    """Testa registrar proposta"""
    print_header("4️⃣ REGISTRAR PROPOSTA")
    
    payload = {
        "cidadao_id": 1,
        "conteudo": "Precisamos de mais ciclovias na região para incentivar o transporte sustentável",
        "tipo_conteudo": "texto",
        "cidade": "João Pessoa",
        "grupo_inclusao": "Ciclistas"
    }
    
    try:
        print_info(f"Enviando: {json.dumps(payload, ensure_ascii=False)}")
        response = requests.post(
            f"{API_URL}/api/v1/proposals",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Proposta registrada: ID {data['proposta_id']}")
            print(f"Tema classificado: {data['tema_classificado']}")
            print(f"Confiança: {data['confidence_score']:.2%}")
            print_json(data)
            return True
        else:
            print_error(f"Status: {response.status_code}")
            print_json(response.json())
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_metrics_lacuna():
    """Testa métricas de lacuna"""
    print_header("5️⃣ MÉTRICAS DE LACUNA LEGISLATIVA")
    
    try:
        response = requests.get(
            f"{API_URL}/api/v1/metrics/lacuna",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print_success("Métricas obtidas")
            
            if data['lacunas_por_tema']:
                print(f"\n{Colors.BOLD}Lacunas por Tema:{Colors.END}")
                for lacuna in data['lacunas_por_tema'][:3]:
                    print(f"  • {lacuna['tema']}: {lacuna['percentual_lacuna']:.1f}% - {lacuna['classificacao']}")
            else:
                print_info("Nenhuma lacuna por tema (banco vazio)")
            
            if data['lacunas_por_grupo']:
                print(f"\n{Colors.BOLD}Lacunas por Grupo:{Colors.END}")
                for lacuna in data['lacunas_por_grupo'][:3]:
                    print(f"  • {lacuna['grupo']}: {lacuna['percentual_lacuna']:.1f}% - {lacuna['classificacao']}")
            
            if data['lacunas_por_cidade']:
                print(f"\n{Colors.BOLD}Lacunas por Cidade:{Colors.END}")
                for lacuna in data['lacunas_por_cidade'][:3]:
                    print(f"  • {lacuna['cidade']}: {lacuna['percentual_lacuna']:.1f}% - {lacuna['classificacao']}")
            
            return True
        else:
            print_error(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_dashboard_resumo():
    """Testa resumo do dashboard"""
    print_header("6️⃣ DASHBOARD RESUMO (KPIs)")
    
    try:
        response = requests.get(
            f"{API_URL}/api/v1/dashboard/resumo",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("KPIs do dashboard obtidos")
            
            print(f"\n{Colors.BOLD}Métricas Principais:{Colors.END}")
            print(f"  👥 Cidadãos ativos: {data['total_cidadaos']}")
            print(f"  💬 Total de interações: {data['total_interacoes']}")
            print(f"  💡 Total de propostas: {data['total_propostas']}")
            print(f"  📊 Taxa de engajamento: {data['media_engajamento']:.2f}%")
            print(f"  📅 Última atualização: {data['ultima_atualizacao']}")
            
            return True
        else:
            print_error(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_tendencia_interacoes():
    """Testa tendência de interações"""
    print_header("7️⃣ TENDÊNCIA DE INTERAÇÕES (7 DIAS)")
    
    try:
        response = requests.get(
            f"{API_URL}/api/v1/dashboard/tendencia-interacoes?dias=7",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Tendência obtida")
            
            print(f"\n{Colors.BOLD}Interações por dia:{Colors.END}")
            for item in data['dados']:
                print(f"  📅 {item['data']}: {item['quantidade']} interações")
            
            return True
        else:
            print_error(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def test_propostas_populares():
    """Testa propostas populares"""
    print_header("8️⃣ PROPOSTAS POPULARES")
    
    try:
        response = requests.get(
            f"{API_URL}/api/v1/dashboard/propostas-populares?limite=5",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"{data['total']} propostas obtidas")
            
            if data['propostas']:
                print(f"\n{Colors.BOLD}Propostas mais recentes:{Colors.END}")
                for prop in data['propostas']:
                    print(f"\n  ID: {prop['proposta_id']}")
                    print(f"  Conteúdo: {prop['conteudo'][:60]}...")
                    print(f"  Tema: {prop['tema_principal']}")
                    print(f"  Cidade: {prop['cidade']}")
            else:
                print_info("Nenhuma proposta registrada")
            
            return True
        else:
            print_error(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro: {e}")
        return False

def main():
    """Função principal"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔════════════════════════════════════════════════╗")
    print("║  🧪 TESTE DE INTEGRAÇÃO - DASHBOARD + PIPELINE  ║")
    print("╚════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    print_info(f"Testando API em: {API_URL}")
    print_info(f"Horário: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
    
    results = {}
    
    # Teste 1: Health Check
    results['health'] = test_health_check()
    if not results['health']:
        print_error("API não está respondendo. Abortando testes.")
        return
    
    time.sleep(1)
    
    # Teste 2: PL Aleatório
    has_pl, pl_data = test_random_pl()
    results['random_pl'] = has_pl
    pl_id = pl_data['id'] if pl_data else 1
    
    time.sleep(1)
    
    # Teste 3: Registrar Interação
    results['interaction'] = test_register_interaction(pl_id)
    
    time.sleep(1)
    
    # Teste 4: Registrar Proposta
    results['proposal'] = test_register_proposal()
    
    time.sleep(1)
    
    # Teste 5: Métricas de Lacuna
    results['metrics'] = test_metrics_lacuna()
    
    time.sleep(1)
    
    # Teste 6: Dashboard Resumo
    results['dashboard'] = test_dashboard_resumo()
    
    time.sleep(1)
    
    # Teste 7: Tendência
    results['trend'] = test_tendencia_interacoes()
    
    time.sleep(1)
    
    # Teste 8: Propostas Populares
    results['popular'] = test_propostas_populares()
    
    # Resultado final
    print_header("📊 RESULTADO FINAL")
    
    total_testes = len(results)
    testes_passaram = sum(1 for v in results.values() if v)
    
    print(f"{Colors.BOLD}Testes realizados: {testes_passaram}/{total_testes}{Colors.END}\n")
    
    for test, resultado in results.items():
        status = f"{Colors.GREEN}✅ PASSOU{Colors.END}" if resultado else f"{Colors.RED}⚠️  PASSOU COM AVISOS{Colors.END}"
        print(f"  {test.upper():20} {status}")
    
    print()
    
    if testes_passaram == total_testes:
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 TODOS OS TESTES PASSARAM!{Colors.END}\n")
        print_success("A integração está funcionando corretamente!")
        print_info("Agora você pode:")
        print_info("  1. Abrir http://localhost:8501 no navegador para ver o Dashboard")
        print_info("  2. Fazer F5 para atualizar e ver os dados em tempo real")
        print_info("  3. Registrar mais interações e propostas para testar")
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  Alguns testes tiveram avisos{Colors.END}\n")
        print_info("Verifique os erros acima e tente novamente")
    
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Testes cancelados pelo usuário.{Colors.END}\n")
    except Exception as e:
        print(f"\n{Colors.RED}Erro inesperado: {e}{Colors.END}\n")
