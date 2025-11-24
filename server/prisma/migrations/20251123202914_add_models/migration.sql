-- CreateTable
CREATE TABLE "cidadaos" (
    "id" SERIAL NOT NULL,
    "telefone_hash" VARCHAR(255) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "grupo_inclusao" VARCHAR(50),
    "temas_interesse" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cidadaos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos_lei" (
    "id" SERIAL NOT NULL,
    "pl_id" VARCHAR(100) NOT NULL,
    "titulo" VARCHAR(500) NOT NULL,
    "resumo" TEXT,
    "tema_principal" VARCHAR(100) NOT NULL,
    "temas_secundarios" TEXT,
    "cidade" VARCHAR(100),
    "status" VARCHAR(50),
    "url_fonte" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projetos_lei_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" SERIAL NOT NULL,
    "cidadao_id" INTEGER NOT NULL,
    "pl_id" INTEGER,
    "tipo_interacao" VARCHAR(50) NOT NULL,
    "opiniao" VARCHAR(20),
    "conteudo" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propostas_pauta" (
    "id" SERIAL NOT NULL,
    "cidadao_id" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "tipo_conteudo" VARCHAR(50) NOT NULL,
    "audio_url" VARCHAR(500),
    "tema_principal" VARCHAR(100),
    "temas_secundarios" TEXT,
    "confidence_score" REAL,
    "cidade" VARCHAR(100) NOT NULL,
    "grupo_inclusao" VARCHAR(50),
    "embedding" TEXT,
    "similaridade_grupo" INTEGER,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propostas_pauta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_lacuna" (
    "id" SERIAL NOT NULL,
    "tipo_agregacao" VARCHAR(50) NOT NULL,
    "chave" VARCHAR(200) NOT NULL,
    "demandas_cidadaos" INTEGER NOT NULL,
    "pls_tramitacao" INTEGER NOT NULL,
    "percentual_lacuna" REAL NOT NULL,
    "classificacao" VARCHAR(50) NOT NULL,
    "periodo_inicio" TIMESTAMP(6) NOT NULL,
    "periodo_fim" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricas_lacuna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cidadaos_telefone_hash_key" ON "cidadaos"("telefone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "projetos_lei_pl_id_key" ON "projetos_lei"("pl_id");

-- CreateIndex
CREATE INDEX "idx_interacoes_cidadao" ON "interacoes"("cidadao_id");

-- CreateIndex
CREATE INDEX "idx_interacoes_pl" ON "interacoes"("pl_id");

-- CreateIndex
CREATE INDEX "idx_interacoes_timestamp" ON "interacoes"("timestamp");

-- CreateIndex
CREATE INDEX "idx_propostas_cidadao" ON "propostas_pauta"("cidadao_id");

-- CreateIndex
CREATE INDEX "idx_propostas_tema" ON "propostas_pauta"("tema_principal");

-- CreateIndex
CREATE INDEX "idx_propostas_cidade" ON "propostas_pauta"("cidade");

-- CreateIndex
CREATE INDEX "idx_propostas_timestamp" ON "propostas_pauta"("timestamp");

-- CreateIndex
CREATE INDEX "idx_metricas_tipo" ON "metricas_lacuna"("tipo_agregacao");

-- CreateIndex
CREATE INDEX "idx_metricas_created" ON "metricas_lacuna"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_lacuna_tipo_agregacao_chave_periodo_inicio_periodo_key" ON "metricas_lacuna"("tipo_agregacao", "chave", "periodo_inicio", "periodo_fim");

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_cidadao_id_fkey" FOREIGN KEY ("cidadao_id") REFERENCES "cidadaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_pl_id_fkey" FOREIGN KEY ("pl_id") REFERENCES "projetos_lei"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas_pauta" ADD CONSTRAINT "propostas_pauta_cidadao_id_fkey" FOREIGN KEY ("cidadao_id") REFERENCES "cidadaos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
