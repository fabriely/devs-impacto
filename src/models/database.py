"""
SQLAlchemy models for Voz.Local Pipeline

This module defines all database models for the Voz.Local system:
- Cidadao: Citizens who interact with the system
- ProjetoLei: Legislative bills (PLs) being tracked
- Interacao: Citizen interactions with PLs (opinions, views, reactions)
- PropostaPauta: Citizen proposals for new legislation
- MetricaLacuna: Cached metrics for legislative gaps
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Cidadao(Base):
    """
    Represents a citizen who interacts with the Voz.Local system via WhatsApp.
    
    Attributes:
        id: Primary key
        telefone_hash: Encrypted phone number hash (unique identifier)
        cidade: City where the citizen resides
        grupo_inclusao: Inclusion group (Mulheres, PCDs, LGBTQIA+, Idosos, etc.)
        temas_interesse: JSON array of topics the citizen is interested in
        created_at: Timestamp when the record was created
        updated_at: Timestamp when the record was last updated
    """
    __tablename__ = 'cidadaos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    telefone_hash = Column(String(255), unique=True, nullable=False)
    cidade = Column(String(100), nullable=False)
    grupo_inclusao = Column(String(50))
    temas_interesse = Column(Text)  # JSON array
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    interacoes = relationship("Interacao", back_populates="cidadao", cascade="all, delete-orphan")
    propostas = relationship("PropostaPauta", back_populates="cidadao", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Cidadao(id={self.id}, cidade='{self.cidade}', grupo_inclusao='{self.grupo_inclusao}')>"


class ProjetoLei(Base):
    """
    Represents a legislative bill (Projeto de Lei) being tracked by the system.
    
    Attributes:
        id: Primary key
        pl_id: External identifier for the PL (unique)
        titulo: Title of the legislative bill
        resumo: Summary of the bill in simple language
        tema_principal: Main theme/topic of the bill
        temas_secundarios: JSON array of secondary themes
        cidade: City or region the bill applies to
        status: Current status (tramitacao, aprovado, rejeitado)
        url_fonte: Source URL where the bill can be found
        created_at: Timestamp when the record was created
    """
    __tablename__ = 'projetos_lei'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pl_id = Column(String(100), unique=True, nullable=False)
    titulo = Column(String(500), nullable=False)
    resumo = Column(Text)
    tema_principal = Column(String(100), nullable=False)
    temas_secundarios = Column(Text)  # JSON array
    cidade = Column(String(100))
    status = Column(String(50))
    url_fonte = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    interacoes = relationship("Interacao", back_populates="projeto_lei", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProjetoLei(id={self.id}, pl_id='{self.pl_id}', tema='{self.tema_principal}')>"


class Interacao(Base):
    """
    Represents a citizen's interaction with a legislative bill.
    
    Interaction types include:
    - opiniao: Citizen expresses opinion (a_favor, contra, pular)
    - visualizacao: Citizen views a PL
    - reacao: Citizen reacts with emoji
    
    Attributes:
        id: Primary key
        cidadao_id: Foreign key to Cidadao
        pl_id: Foreign key to ProjetoLei (nullable for non-PL interactions)
        tipo_interacao: Type of interaction (opiniao, visualizacao, reacao)
        opiniao: Opinion value (a_favor, contra, pular) if tipo_interacao is 'opiniao'
        conteudo: Optional text content of the interaction
        metadata: JSON object with additional data (cidade, grupo_inclusao, etc.)
        timestamp: When the interaction occurred
        created_at: When the record was created in the database
    """
    __tablename__ = 'interacoes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cidadao_id = Column(Integer, ForeignKey('cidadaos.id'), nullable=False)
    pl_id = Column(Integer, ForeignKey('projetos_lei.id'))
    tipo_interacao = Column(String(50), nullable=False)
    opiniao = Column(String(20))
    conteudo = Column(Text)
    metadata_json = Column('metadata', Text)  # JSON object - using column name 'metadata' with attribute name 'metadata_json'
    timestamp = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cidadao = relationship("Cidadao", back_populates="interacoes")
    projeto_lei = relationship("ProjetoLei", back_populates="interacoes")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_interacoes_cidadao', 'cidadao_id'),
        Index('idx_interacoes_pl', 'pl_id'),
        Index('idx_interacoes_timestamp', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<Interacao(id={self.id}, tipo='{self.tipo_interacao}', cidadao_id={self.cidadao_id})>"


class PropostaPauta(Base):
    """
    Represents a citizen's proposal for new legislation (proposta de pauta).
    
    Citizens can submit proposals via text or audio. The system automatically
    classifies the theme using AI and groups similar proposals together.
    
    Attributes:
        id: Primary key
        cidadao_id: Foreign key to Cidadao
        conteudo: Text content of the proposal (or transcription if audio)
        tipo_conteudo: Type of content (texto, audio_transcrito)
        audio_url: URL to audio file if proposal was submitted via audio
        tema_principal: Main theme classified by AI
        temas_secundarios: JSON array of secondary themes
        confidence_score: AI classification confidence (0.0 to 1.0)
        cidade: City of the citizen who submitted the proposal
        grupo_inclusao: Inclusion group of the citizen
        status: Processing status (pendente, revisao_manual, aprovada)
        grupo_duplicatas: ID grouping similar proposals together
        timestamp: When the proposal was submitted
        created_at: When the record was created in the database
    """
    __tablename__ = 'propostas_pauta'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cidadao_id = Column(Integer, ForeignKey('cidadaos.id'), nullable=False)
    conteudo = Column(Text, nullable=False)
    tipo_conteudo = Column(String(50), nullable=False)
    audio_url = Column(String(500))
    tema_principal = Column(String(100))
    temas_secundarios = Column(Text)  # JSON array
    confidence_score = Column(Float)
    cidade = Column(String(100), nullable=False)
    grupo_inclusao = Column(String(50))
    status = Column(String(50), default='pendente')
    grupo_duplicatas = Column(Integer)
    timestamp = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cidadao = relationship("Cidadao", back_populates="propostas")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_propostas_tema', 'tema_principal'),
        Index('idx_propostas_cidade', 'cidade'),
        Index('idx_propostas_grupo', 'grupo_inclusao'),
        Index('idx_propostas_timestamp', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<PropostaPauta(id={self.id}, tema='{self.tema_principal}', cidade='{self.cidade}')>"


class MetricaLacuna(Base):
    """
    Cached metrics for legislative gaps (Métrica de Lacuna Legislativa).
    
    This table stores pre-calculated metrics comparing citizen demands
    vs. legislative bills in tramitação. Metrics are segmented by:
    - Theme (Saúde, Educação, Transporte, etc.)
    - Inclusion group (Mulheres, PCDs, LGBTQIA+, etc.)
    - City
    
    The lacuna percentage represents the gap between what citizens demand
    and what the legislature is working on.
    
    Attributes:
        id: Primary key
        tipo_segmentacao: Type of segmentation (tema, grupo, cidade)
        chave_segmentacao: Specific value for the segment (e.g., "Saúde", "Mulheres")
        demandas_cidadaos: Count of citizen demands in this segment
        pls_tramitacao: Count of PLs in tramitação in this segment
        percentual_lacuna: Calculated gap percentage
        classificacao_lacuna: Classification (Alta, Média, Baixa)
        calculated_at: When the metric was calculated
    """
    __tablename__ = 'metricas_lacuna'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo_segmentacao = Column(String(50), nullable=False)
    chave_segmentacao = Column(String(100), nullable=False)
    demandas_cidadaos = Column(Integer, nullable=False)
    pls_tramitacao = Column(Integer, nullable=False)
    percentual_lacuna = Column(Float, nullable=False)
    classificacao_lacuna = Column(String(20), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Unique constraint on segmentation type and key
    __table_args__ = (
        Index('idx_metricas_segmentacao', 'tipo_segmentacao', 'chave_segmentacao', unique=True),
    )
    
    def __repr__(self):
        return f"<MetricaLacuna(tipo='{self.tipo_segmentacao}', chave='{self.chave_segmentacao}', lacuna={self.percentual_lacuna}%)>"
