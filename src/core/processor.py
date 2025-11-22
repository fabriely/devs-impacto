"""
Data Processor module for Voz.Local Pipeline.

This module handles the persistence of interactions and proposals to the database,
including validation and data enrichment.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import json

from src.models.database import Cidadao, ProjetoLei, Interacao, PropostaPauta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when data validation fails."""
    pass


class DataProcessor:
    """
    Processes and persists citizen interactions and proposals to the database.
    
    This class handles:
    - Validation of required fields
    - Creation or retrieval of citizen records
    - Persistence of interactions (opinions, views, reactions)
    - Persistence of proposals with metadata
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize the DataProcessor.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session
    
    def _validate_interaction_data(self, interaction_data: Dict[str, Any]) -> None:
        """
        Validate interaction data has all required fields.
        
        Args:
            interaction_data: Dictionary containing interaction data
            
        Raises:
            ValidationError: If required fields are missing or invalid
        """
        required_fields = ['cidadao_id', 'tipo_interacao', 'timestamp']
        
        for field in required_fields:
            if field not in interaction_data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate tipo_interacao
        valid_tipos = ['opiniao', 'visualizacao', 'reacao']
        if interaction_data['tipo_interacao'] not in valid_tipos:
            raise ValidationError(
                f"Invalid tipo_interacao: {interaction_data['tipo_interacao']}. "
                f"Must be one of: {', '.join(valid_tipos)}"
            )
        
        # Validate opiniao if tipo_interacao is 'opiniao'
        if interaction_data['tipo_interacao'] == 'opiniao':
            if 'opiniao' not in interaction_data:
                raise ValidationError("Field 'opiniao' is required when tipo_interacao is 'opiniao'")
            
            valid_opinioes = ['a_favor', 'contra', 'pular']
            if interaction_data['opiniao'] not in valid_opinioes:
                raise ValidationError(
                    f"Invalid opiniao: {interaction_data['opiniao']}. "
                    f"Must be one of: {', '.join(valid_opinioes)}"
                )
    
    def _validate_proposal_data(self, proposal_data: Dict[str, Any]) -> None:
        """
        Validate proposal data has all required fields.
        
        Args:
            proposal_data: Dictionary containing proposal data
            
        Raises:
            ValidationError: If required fields are missing or invalid
        """
        required_fields = ['cidadao_id', 'conteudo', 'tipo_conteudo', 'cidade', 'timestamp']
        
        for field in required_fields:
            if field not in proposal_data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate tipo_conteudo
        valid_tipos = ['texto', 'audio_transcrito']
        if proposal_data['tipo_conteudo'] not in valid_tipos:
            raise ValidationError(
                f"Invalid tipo_conteudo: {proposal_data['tipo_conteudo']}. "
                f"Must be one of: {', '.join(valid_tipos)}"
            )
        
        # Validate conteudo is not empty
        if not proposal_data['conteudo'] or not proposal_data['conteudo'].strip():
            raise ValidationError("Field 'conteudo' cannot be empty")
    
    def _get_or_create_cidadao(self, cidadao_data: Dict[str, Any]) -> Cidadao:
        """
        Get existing citizen or create a new one.
        
        Args:
            cidadao_data: Dictionary with citizen information
            
        Returns:
            Cidadao: The citizen record
        """
        # Try to find existing citizen by ID
        if 'id' in cidadao_data:
            cidadao = self.db.query(Cidadao).filter_by(id=cidadao_data['id']).first()
            if cidadao:
                return cidadao
        
        # Try to find by telefone_hash
        if 'telefone_hash' in cidadao_data:
            cidadao = self.db.query(Cidadao).filter_by(
                telefone_hash=cidadao_data['telefone_hash']
            ).first()
            if cidadao:
                return cidadao
        
        # Create new citizen if not found
        cidadao = Cidadao(
            telefone_hash=cidadao_data.get('telefone_hash', f"hash_{cidadao_data.get('id')}"),
            cidade=cidadao_data.get('cidade', 'Unknown'),
            grupo_inclusao=cidadao_data.get('grupo_inclusao'),
            temas_interesse=json.dumps(cidadao_data.get('temas_interesse', []))
        )
        self.db.add(cidadao)
        self.db.flush()  # Get the ID without committing
        
        logger.info(f"Created new citizen: {cidadao.id}")
        return cidadao
    
    def process_interaction(self, interaction_data: Dict[str, Any]) -> Interacao:
        """
        Validate and persist a citizen interaction to the database.
        
        This method:
        1. Validates the interaction data
        2. Ensures the citizen exists (or creates them)
        3. Creates the interaction record
        4. Persists to database
        
        Args:
            interaction_data: Dictionary containing:
                - cidadao_id: ID or hash of the citizen
                - tipo_interacao: Type (opiniao, visualizacao, reacao)
                - opiniao: Opinion value (if tipo_interacao is 'opiniao')
                - pl_id: Optional PL ID
                - conteudo: Optional text content
                - metadata: Optional metadata dict
                - timestamp: When the interaction occurred
        
        Returns:
            Interacao: The persisted interaction record
            
        Raises:
            ValidationError: If data validation fails
            SQLAlchemyError: If database operation fails
            
        Example:
            >>> processor = DataProcessor(session)
            >>> interaction = processor.process_interaction({
            ...     'cidadao_id': 123,
            ...     'tipo_interacao': 'opiniao',
            ...     'opiniao': 'a_favor',
            ...     'pl_id': 456,
            ...     'timestamp': datetime.utcnow(),
            ...     'metadata': {'cidade': 'São Paulo', 'grupo_inclusao': 'Mulheres'}
            ... })
        """
        try:
            # Validate data
            self._validate_interaction_data(interaction_data)
            
            # Get or create citizen
            cidadao_id = interaction_data['cidadao_id']
            if isinstance(cidadao_id, int):
                # It's an ID, verify it exists
                cidadao = self.db.query(Cidadao).filter_by(id=cidadao_id).first()
                if not cidadao:
                    raise ValidationError(f"Cidadao with id {cidadao_id} not found")
            else:
                # It's a hash or other identifier, get or create
                cidadao = self._get_or_create_cidadao({'telefone_hash': str(cidadao_id)})
                cidadao_id = cidadao.id
            
            # Create interaction
            interacao = Interacao(
                cidadao_id=cidadao_id,
                pl_id=interaction_data.get('pl_id'),
                tipo_interacao=interaction_data['tipo_interacao'],
                opiniao=interaction_data.get('opiniao'),
                conteudo=interaction_data.get('conteudo'),
                metadata_json=json.dumps(interaction_data.get('metadata', {})),
                timestamp=interaction_data['timestamp']
            )
            
            self.db.add(interacao)
            self.db.commit()
            
            logger.info(
                f"Persisted interaction: id={interacao.id}, "
                f"tipo={interacao.tipo_interacao}, cidadao_id={cidadao_id}"
            )
            
            return interacao
            
        except ValidationError:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error while processing interaction: {e}")
            raise
    
    def process_proposal(self, proposal_data: Dict[str, Any]) -> PropostaPauta:
        """
        Validate and persist a citizen proposal to the database.
        
        This method:
        1. Validates the proposal data
        2. Ensures the citizen exists (or creates them)
        3. Creates the proposal record with metadata
        4. Persists to database
        
        Args:
            proposal_data: Dictionary containing:
                - cidadao_id: ID or hash of the citizen
                - conteudo: Text content of the proposal
                - tipo_conteudo: Type (texto, audio_transcrito)
                - cidade: City of the citizen
                - grupo_inclusao: Optional inclusion group
                - audio_url: Optional audio URL
                - tema_principal: Optional theme (will be classified by AI later)
                - timestamp: When the proposal was submitted
        
        Returns:
            PropostaPauta: The persisted proposal record
            
        Raises:
            ValidationError: If data validation fails
            SQLAlchemyError: If database operation fails
            
        Example:
            >>> processor = DataProcessor(session)
            >>> proposal = processor.process_proposal({
            ...     'cidadao_id': 123,
            ...     'conteudo': 'Precisamos de mais creches no bairro',
            ...     'tipo_conteudo': 'texto',
            ...     'cidade': 'São Paulo',
            ...     'grupo_inclusao': 'Mulheres',
            ...     'timestamp': datetime.utcnow()
            ... })
        """
        try:
            # Validate data
            self._validate_proposal_data(proposal_data)
            
            # Get or create citizen
            cidadao_id = proposal_data['cidadao_id']
            if isinstance(cidadao_id, int):
                # It's an ID, verify it exists
                cidadao = self.db.query(Cidadao).filter_by(id=cidadao_id).first()
                if not cidadao:
                    raise ValidationError(f"Cidadao with id {cidadao_id} not found")
            else:
                # It's a hash or other identifier, get or create
                cidadao_data = {
                    'telefone_hash': str(cidadao_id),
                    'cidade': proposal_data['cidade'],
                    'grupo_inclusao': proposal_data.get('grupo_inclusao')
                }
                cidadao = self._get_or_create_cidadao(cidadao_data)
                cidadao_id = cidadao.id
            
            # Create proposal
            proposta = PropostaPauta(
                cidadao_id=cidadao_id,
                conteudo=proposal_data['conteudo'],
                tipo_conteudo=proposal_data['tipo_conteudo'],
                audio_url=proposal_data.get('audio_url'),
                tema_principal=proposal_data.get('tema_principal'),
                temas_secundarios=json.dumps(proposal_data.get('temas_secundarios', [])),
                confidence_score=proposal_data.get('confidence_score'),
                cidade=proposal_data['cidade'],
                grupo_inclusao=proposal_data.get('grupo_inclusao'),
                status=proposal_data.get('status', 'pendente'),
                grupo_duplicatas=proposal_data.get('grupo_duplicatas'),
                timestamp=proposal_data['timestamp']
            )
            
            self.db.add(proposta)
            self.db.commit()
            
            logger.info(
                f"Persisted proposal: id={proposta.id}, "
                f"cidade={proposta.cidade}, cidadao_id={cidadao_id}"
            )
            
            return proposta
            
        except ValidationError:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error while processing proposal: {e}")
            raise
