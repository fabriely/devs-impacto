"""
FastAPI application for Voz.Local Pipeline.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import os

from src.core.database_init import init_database
from src.core.processor import DataProcessor, ValidationError
from src.core.classifier import AIClassifier
from src.core.calculator import MetricsCalculator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Voz.Local Pipeline API",
    description="API for processing citizen interactions and proposals",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/voz_local.db")
engine, SessionLocal = init_database(DATABASE_URL)

# Initialize AI Classifier
ai_classifier = AIClassifier()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic models
class InteractionRequest(BaseModel):
    cidadao_id: int
    tipo_interacao: str = Field(..., pattern="^(opiniao|visualizacao|reacao)$")
    opiniao: Optional[str] = Field(None, pattern="^(a_favor|contra|pular)$")
    pl_id: Optional[int] = None
    conteudo: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class InteractionResponse(BaseModel):
    status: str
    interacao_id: int
    message: str


class ProposalRequest(BaseModel):
    cidadao_id: int
    conteudo: str
    tipo_conteudo: str = Field(..., pattern="^(texto|audio_transcrito)$")
    audio_url: Optional[str] = None
    cidade: str
    grupo_inclusao: Optional[str] = None


class ProposalResponse(BaseModel):
    status: str
    proposta_id: int
    tema_classificado: str
    confidence_score: float
    message: str


class LacunaMetric(BaseModel):
    tema: Optional[str] = None
    grupo: Optional[str] = None
    cidade: Optional[str] = None
    demandas_cidadaos: int
    pls_tramitacao: int
    percentual_lacuna: float
    classificacao: str


class MetricsResponse(BaseModel):
    lacunas_por_tema: List[LacunaMetric]
    lacunas_por_grupo: List[LacunaMetric]
    lacunas_por_cidade: List[LacunaMetric]


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "voz-local-pipeline"}


# POST /interactions endpoint
@app.post("/api/v1/interactions", response_model=InteractionResponse)
async def create_interaction(
    interaction: InteractionRequest,
    db: Session = Depends(get_db)
):
    """
    Register a citizen interaction (opinion, view, or reaction).
    """
    try:
        processor = DataProcessor(db)
        
        interaction_data = {
            'cidadao_id': interaction.cidadao_id,
            'tipo_interacao': interaction.tipo_interacao,
            'opiniao': interaction.opiniao,
            'pl_id': interaction.pl_id,
            'conteudo': interaction.conteudo,
            'timestamp': datetime.utcnow(),
            'metadata': interaction.metadata or {}
        }
        
        interacao = processor.process_interaction(interaction_data)
        
        return InteractionResponse(
            status="success",
            interacao_id=interacao.id,
            message="Interação registrada com sucesso"
        )
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating interaction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# POST /proposals endpoint
@app.post("/api/v1/proposals", response_model=ProposalResponse)
async def create_proposal(
    proposal: ProposalRequest,
    db: Session = Depends(get_db)
):
    """
    Register a citizen proposal and classify its theme using AI.
    """
    try:
        # Classify theme using AI
        classification = ai_classifier.classify_theme(proposal.conteudo)
        
        processor = DataProcessor(db)
        
        proposal_data = {
            'cidadao_id': proposal.cidadao_id,
            'conteudo': proposal.conteudo,
            'tipo_conteudo': proposal.tipo_conteudo,
            'audio_url': proposal.audio_url,
            'cidade': proposal.cidade,
            'grupo_inclusao': proposal.grupo_inclusao,
            'tema_principal': classification.tema_principal,
            'temas_secundarios': classification.temas_secundarios,
            'confidence_score': classification.confidence_score,
            'status': 'revisao_manual' if classification.needs_review else 'pendente',
            'timestamp': datetime.utcnow()
        }
        
        proposta = processor.process_proposal(proposal_data)
        
        return ProposalResponse(
            status="success",
            proposta_id=proposta.id,
            tema_classificado=classification.tema_principal,
            confidence_score=classification.confidence_score,
            message="Proposta registrada e classificada"
        )
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating proposal: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# GET /metrics/lacuna endpoint
@app.get("/api/v1/metrics/lacuna", response_model=MetricsResponse)
async def get_lacuna_metrics(db: Session = Depends(get_db)):
    """
    Get legislative gap metrics.
    """
    try:
        calculator = MetricsCalculator(db)
        
        # Calculate metrics
        lacunas_tema = calculator.calculate_lacuna_by_theme()
        lacunas_grupo = calculator.calculate_lacuna_by_group()
        lacunas_cidade = calculator.calculate_lacuna_by_city()
        
        return MetricsResponse(
            lacunas_por_tema=[
                LacunaMetric(
                    tema=m['chave'],
                    demandas_cidadaos=m['demandas'],
                    pls_tramitacao=m['pls'],
                    percentual_lacuna=m['lacuna'],
                    classificacao=m['classificacao']
                ) for m in lacunas_tema
            ],
            lacunas_por_grupo=[
                LacunaMetric(
                    grupo=m['chave'],
                    demandas_cidadaos=m['demandas'],
                    pls_tramitacao=m['pls'],
                    percentual_lacuna=m['lacuna'],
                    classificacao=m['classificacao']
                ) for m in lacunas_grupo
            ],
            lacunas_por_cidade=[
                LacunaMetric(
                    cidade=m['chave'],
                    demandas_cidadaos=m['demandas'],
                    pls_tramitacao=m['pls'],
                    percentual_lacuna=m['lacuna'],
                    classificacao=m['classificacao']
                ) for m in lacunas_cidade
            ]
        )
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
