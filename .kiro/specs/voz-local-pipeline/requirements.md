# Requirements Document

## Introduction

O Voz.Local é uma plataforma de engajamento cidadão que democratiza o acesso à informação legislativa e captura demandas da população. Este documento especifica o pipeline completo de dados que captura interações de cidadãos via WhatsApp sobre Projetos de Lei, processa e armazena essas informações em banco de dados, e as disponibiliza através de um dashboard público que evidencia a Métrica de Lacuna Legislativa - a diferença entre o que o povo demanda e o que o Legislativo tramita.

## Glossary

- **Voz.Local**: A plataforma completa de engajamento cidadão e accountability legislativo
- **Cidadão**: Pessoa que interage com o bot via WhatsApp para receber informações sobre PLs e expressar opiniões
- **Projeto de Lei (PL)**: Proposta legislativa em tramitação na Câmara, Senado ou Câmaras Municipais
- **Score de Impacto**: Métrica calculada pela IA que indica a relevância de um PL para determinado grupo ou região
- **Opinião Cidadã**: Manifestação do cidadão sobre um PL (a favor, contra, ou proposta de pauta)
- **Proposta de Pauta**: Demanda legislativa sugerida pelo cidadão que ainda não está em tramitação
- **Métrica de Lacuna Legislativa**: Comparação quantitativa entre demandas dos cidadãos e pautas em tramitação
- **Dashboard Público**: Interface visual em Streamlit que exibe métricas de accountability e lacunas legislativas
- **Bot WhatsApp**: Sistema automatizado que distribui PLs e captura opiniões via WhatsApp usando Baileys
- **Grupo de Inclusão**: Segmentação de cidadãos por vulnerabilidade (Mulheres, PCDs, LGBTQIA+, etc.)
- **Pipeline de Dados**: Fluxo completo desde captura de interações até visualização no dashboard
- **Banco de Dados**: Sistema PostgreSQL que armazena dados de cidadãos, PLs, interações e métricas

## Requirements

### Requirement 1

**User Story:** Como cidadão, eu quero receber resumos de Projetos de Lei via WhatsApp em linguagem simples, para que eu possa entender o que muda na minha vida sem precisar ler textos complexos.

#### Acceptance Criteria

1. WHEN o bot envia um resumo de PL ao cidadão THEN o Voz.Local SHALL registrar o envio com timestamp, PL_id e cidadao_id
2. WHEN o cidadão solicita áudio do resumo THEN o Voz.Local SHALL registrar a preferência por formato acessível
3. WHEN o bot envia um PL THEN o Voz.Local SHALL incluir metadados de cidade, tema e grupo de inclusão relevante
4. WHEN o cidadão visualiza um PL THEN o Voz.Local SHALL marcar o PL como visualizado para aquele cidadão
5. WHEN o envio de PL falha THEN o Voz.Local SHALL registrar a falha e tentar reenviar até três vezes

### Requirement 2

**User Story:** Como cidadão, eu quero expressar minha opinião sobre Projetos de Lei (a favor, contra ou pular), para que minha voz seja contabilizada nas métricas de engajamento.

#### Acceptance Criteria

1. WHEN o cidadão responde "a favor" a um PL THEN o Voz.Local SHALL registrar opinião positiva com timestamp e PL_id
2. WHEN o cidadão responde "contra" a um PL THEN o Voz.Local SHALL registrar opinião negativa com timestamp e PL_id
3. WHEN o cidadão responde "pular" a um PL THEN o Voz.Local SHALL registrar abstenção com timestamp e PL_id
4. WHEN o cidadão reage com emoji a um PL THEN o Voz.Local SHALL capturar o tipo de reação e associar ao PL
5. WHEN uma opinião é registrada THEN o Voz.Local SHALL associar a opinião ao grupo de inclusão do cidadão

### Requirement 3

**User Story:** Como cidadão, eu quero propor pautas legislativas que considero importantes, para que minhas demandas sejam visibilizadas no dashboard público.

#### Acceptance Criteria

1. WHEN o cidadão envia uma proposta de pauta via texto THEN o Voz.Local SHALL capturar o conteúdo completo e timestamp
2. WHEN o cidadão envia uma proposta de pauta via áudio THEN o Voz.Local SHALL transcrever o áudio e armazenar tanto o áudio quanto a transcrição
3. WHEN uma proposta de pauta é capturada THEN o Voz.Local SHALL classificar automaticamente o tema usando IA
4. WHEN uma proposta de pauta é capturada THEN o Voz.Local SHALL associar à cidade e grupo de inclusão do cidadão
5. WHEN múltiplas propostas similares são detectadas THEN o Voz.Local SHALL agrupá-las como uma demanda recorrente

### Requirement 4

**User Story:** Como desenvolvedor do sistema, eu quero armazenar todas as interações dos cidadãos de forma estruturada no banco de dados, para que possam ser analisadas e exibidas no dashboard.

#### Acceptance Criteria

1. WHEN uma interação é capturada THEN o Voz.Local SHALL persistir no banco de dados os campos cidadao_id, tipo_interacao, conteudo, timestamp e pl_id
2. WHEN múltiplas interações ocorrem simultaneamente THEN o Voz.Local SHALL garantir que todas sejam persistidas sem perda de dados
3. WHEN uma interação falha ao ser persistida THEN o Voz.Local SHALL registrar o erro em log e tentar novamente até três vezes
4. WHEN dados de um cidadão são armazenados THEN o Voz.Local SHALL incluir informações de cidade, grupo de inclusão e temas de interesse
5. WHEN o banco de dados está indisponível THEN o Voz.Local SHALL armazenar interações em fila temporária e persistir quando a conexão for restabelecida

### Requirement 5

**User Story:** Como analista de dados, eu quero que o sistema calcule automaticamente a Métrica de Lacuna Legislativa, para que o dashboard mostre onde o Legislativo ignora as demandas populares.

#### Acceptance Criteria

1. WHEN propostas de pauta são classificadas por tema THEN o Voz.Local SHALL contar quantas demandas existem por tema e região
2. WHEN PLs em tramitação são classificados por tema THEN o Voz.Local SHALL contar quantos PLs existem por tema e região
3. WHEN a métrica de lacuna é calculada THEN o Voz.Local SHALL comparar volume de demandas cidadãs vs PLs em tramitação por tema
4. WHEN a lacuna excede 70% THEN o Voz.Local SHALL classificar o tema como "Alta Lacuna Legislativa"
5. WHEN a métrica é calculada THEN o Voz.Local SHALL segmentar por grupo de inclusão para evidenciar exclusão de grupos vulneráveis

### Requirement 6

**User Story:** Como gestor de ONG ou jornalista cívico, eu quero visualizar um dashboard público com métricas de engajamento e lacunas legislativas, para que eu possa cobrar accountability dos legisladores.

#### Acceptance Criteria

1. WHEN o dashboard é acessado THEN o Voz.Local SHALL exibir KPIs de total de cidadãos engajados, total de opiniões e total de propostas de pauta
2. WHEN o dashboard é acessado THEN o Voz.Local SHALL exibir gráfico de Métrica de Lacuna Legislativa por tema
3. WHEN o dashboard é acessado THEN o Voz.Local SHALL exibir mapa com cidades que mais demandam pautas vs cidades com mais PLs
4. WHEN o dashboard é acessado THEN o Voz.Local SHALL exibir tabela de propostas de pauta mais recorrentes ordenadas por volume
5. WHEN novos dados são registrados THEN o Voz.Local SHALL atualizar o dashboard automaticamente dentro de 5 segundos

### Requirement 7

**User Story:** Como desenvolvedor do sistema, eu quero que o pipeline de dados seja resiliente a falhas, para que nenhuma opinião ou proposta de pauta seja perdida.

#### Acceptance Criteria

1. WHEN uma etapa do pipeline falha THEN o Voz.Local SHALL registrar o erro detalhadamente em log estruturado
2. WHEN uma falha temporária ocorre THEN o Voz.Local SHALL implementar retry com backoff exponencial até três tentativas
3. WHEN uma falha permanente é detectada THEN o Voz.Local SHALL notificar os administradores via log de erro crítico
4. WHEN o sistema é reiniciado THEN o Voz.Local SHALL processar interações pendentes da fila temporária
5. WHEN dados corrompidos são detectados THEN o Voz.Local SHALL isolar os dados problemáticos e continuar processando dados válidos

### Requirement 8

**User Story:** Como administrador do sistema, eu quero que os dados dos cidadãos sejam tratados com privacidade e segurança, para que estejamos em conformidade com a LGPD.

#### Acceptance Criteria

1. WHEN dados de cidadãos são armazenados THEN o Voz.Local SHALL criptografar informações pessoais identificáveis em repouso
2. WHEN dados de cidadãos são transmitidos THEN o Voz.Local SHALL usar conexões seguras com TLS
3. WHEN o dashboard exibe dados THEN o Voz.Local SHALL anonimizar identificadores diretos dos cidadãos
4. WHEN logs são gerados THEN o Voz.Local SHALL evitar incluir informações pessoais identificáveis
5. WHEN dados de cidadãos são acessados THEN o Voz.Local SHALL registrar auditoria de acesso com timestamp e usuário

### Requirement 9

**User Story:** Como desenvolvedor do sistema, eu quero que o schema do banco de dados suporte todas as entidades necessárias, para que o pipeline funcione corretamente.

#### Acceptance Criteria

1. WHEN o banco de dados é inicializado THEN o Voz.Local SHALL criar tabelas para Cidadao, ProjetoDeLei, Interacao, PropostaDePauta e MetricaLacuna
2. WHEN a tabela Cidadao é criada THEN o Voz.Local SHALL incluir campos para id, telefone_hash, cidade, grupo_inclusao, temas_interesse e created_at
3. WHEN a tabela Interacao é criada THEN o Voz.Local SHALL incluir campos para id, cidadao_id, pl_id, tipo, opiniao, conteudo, timestamp e metadata
4. WHEN a tabela PropostaDePauta é criada THEN o Voz.Local SHALL incluir campos para id, cidadao_id, conteudo, tema_classificado, cidade, grupo_inclusao, timestamp e status
5. WHEN relacionamentos entre tabelas são definidos THEN o Voz.Local SHALL garantir integridade referencial com foreign keys

### Requirement 10

**User Story:** Como analista de dados, eu quero que o sistema classifique automaticamente propostas de pauta por tema, para que a Métrica de Lacuna seja precisa.

#### Acceptance Criteria

1. WHEN uma proposta de pauta é capturada THEN o Voz.Local SHALL usar IA para classificar o tema (Saúde, Educação, Transporte, etc.)
2. WHEN o tema é classificado THEN o Voz.Local SHALL incluir um score de confiança da classificação
3. WHEN o score de confiança é baixo THEN o Voz.Local SHALL marcar a proposta para revisão manual
4. WHEN múltiplas propostas têm conteúdo similar THEN o Voz.Local SHALL detectar duplicatas e agrupá-las
5. WHEN a classificação é armazenada THEN o Voz.Local SHALL incluir tanto o tema principal quanto temas secundários
