##  Farol - Monitor de Engajamento Escolar (Paraíba)

Dashboard em Streamlit para monitoramento de desmotivação escolar na rede pública da Paraíba.

## 📋 Requisitos

```bash
pip install streamlit pandas
```

## 🚀 Como Executar

```bash
.\venv\Scripts\activate
streamlit run dashboard.py
```

O dashboard estará disponível em `http://localhost:8501`

## 📊 Funcionalidades

- **Filtro de Período**: Visualize dados dos últimos 7 ou 30 dias
- **KPIs Principais**: Total de alertas, média de score e alunos monitorados
- **Mapa Interativo**: Visualização geográfica das cidades com maior desmotivação
- **Tabela de Prioridades**: Lista de alunos ordenados por score de desmotivação
- **Atualização em Tempo Real**: Cache de 5 segundos para refletir novos alertas

## 📁 Estrutura de Dados

O arquivo `alertas.json` deve conter:

```json
[
  {
    "aluno_id": "aluno_101",
    "score_desmotivacao": 0.85,
    "observacoes_chave": ["Observação 1", "Observação 2"],
    "cidade": "João Pessoa",
    "lat": -7.1195,
    "lon": -34.8631,
    "timestamp": "2025-11-07T10:00:00Z"
  }
]
```

## 🔄 Integração com Agente Analista

Para adicionar novos alertas em tempo real, o `agente_analista.py` deve:

1. Ler o arquivo `alertas.json` existente
2. Adicionar o novo alerta ao array
3. Salvar o arquivo atualizado

O dashboard detectará automaticamente as mudanças a cada 5 segundos.

## 🎨 Código de Cores

- 🔴 **Alto Risco**: Score >= 0.7
- 🟠 **Médio Risco**: 0.5 <= Score < 0.7
- 🟢 **Baixo Risco**: Score < 0.5
