"""
Property-based tests for data persistence properties.

These tests verify universal properties that should hold across all valid
executions of the data persistence layer.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from contextlib import contextmanager
import json

from src.models.database import Base, Cidadao, ProjetoLei, Interacao, PropostaPauta, MetricaLacuna


# Context manager for database sessions
@contextmanager
def get_db_session():
    """Create a fresh in-memory database session with foreign key constraints enabled."""
    engine = create_engine("sqlite:///:memory:")
    
    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


# Feature: voz-local-pipeline, Property 4: Referential integrity enforcement
@given(
    invalid_cidadao_id=st.integers(min_value=9999, max_value=99999),
    tipo_interacao=st.sampled_from(['opiniao', 'visualizacao', 'reacao']),
    opiniao=st.sampled_from(['a_favor', 'contra', 'pular', None])
)
@settings(max_examples=10, deadline=5000)
def test_referential_integrity_invalid_cidadao_id(invalid_cidadao_id, tipo_interacao, opiniao):
    """
    Property: For any attempt to insert an interaction with an invalid cidadao_id,
    the database should reject the insertion.
    
    **Validates: Requirements 9.5**
    """
    with get_db_session() as db_session:
        # Ensure the cidadao_id doesn't exist in the database
        existing_cidadao = db_session.query(Cidadao).filter_by(id=invalid_cidadao_id).first()
        assume(existing_cidadao is None)
        
        # Attempt to create an interaction with invalid cidadao_id
        interacao = Interacao(
            cidadao_id=invalid_cidadao_id,
            pl_id=None,
            tipo_interacao=tipo_interacao,
            opiniao=opiniao,
            conteudo="Test content",
            metadata_json=json.dumps({"test": "data"}),
            timestamp=datetime.utcnow()
        )
        
        db_session.add(interacao)
        
        # Verify that the database rejects the insertion
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()


# Feature: voz-local-pipeline, Property 4: Referential integrity enforcement
@given(
    invalid_pl_id=st.integers(min_value=9999, max_value=99999),
    tipo_interacao=st.sampled_from(['opiniao', 'visualizacao', 'reacao']),
    opiniao=st.sampled_from(['a_favor', 'contra', 'pular', None])
)
@settings(max_examples=10, deadline=5000)
def test_referential_integrity_invalid_pl_id(invalid_pl_id, tipo_interacao, opiniao):
    """
    Property: For any attempt to insert an interaction with an invalid pl_id,
    the database should reject the insertion.
    
    **Validates: Requirements 9.5**
    """
    with get_db_session() as db_session:
        # First create a valid cidadao
        cidadao = Cidadao(
            telefone_hash=f"hash_{invalid_pl_id}",
            cidade="Test City",
            grupo_inclusao="Mulheres",
            temas_interesse=json.dumps(["Saúde"])
        )
        db_session.add(cidadao)
        db_session.commit()
        
        # Ensure the pl_id doesn't exist in the database
        existing_pl = db_session.query(ProjetoLei).filter_by(id=invalid_pl_id).first()
        assume(existing_pl is None)
        
        # Attempt to create an interaction with invalid pl_id
        interacao = Interacao(
            cidadao_id=cidadao.id,
            pl_id=invalid_pl_id,
            tipo_interacao=tipo_interacao,
            opiniao=opiniao,
            conteudo="Test content",
            metadata_json=json.dumps({"test": "data"}),
            timestamp=datetime.utcnow()
        )
        
        db_session.add(interacao)
        
        # Verify that the database rejects the insertion
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()


# Feature: voz-local-pipeline, Property 4: Referential integrity enforcement
@given(
    invalid_cidadao_id=st.integers(min_value=9999, max_value=99999),
    conteudo=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00']))
)
@settings(max_examples=10, deadline=5000)
def test_referential_integrity_proposta_invalid_cidadao(invalid_cidadao_id, conteudo):
    """
    Property: For any attempt to insert a proposta with an invalid cidadao_id,
    the database should reject the insertion.
    
    **Validates: Requirements 9.5**
    """
    with get_db_session() as db_session:
        # Ensure the cidadao_id doesn't exist in the database
        existing_cidadao = db_session.query(Cidadao).filter_by(id=invalid_cidadao_id).first()
        assume(existing_cidadao is None)
        
        # Attempt to create a proposta with invalid cidadao_id
        proposta = PropostaPauta(
            cidadao_id=invalid_cidadao_id,
            conteudo=conteudo,
            tipo_conteudo="texto",
            cidade="Test City",
            timestamp=datetime.utcnow()
        )
        
        db_session.add(proposta)
        
        # Verify that the database rejects the insertion
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()


# Feature: voz-local-pipeline, Property 4: Referential integrity enforcement
def test_referential_integrity_valid_foreign_keys():
    """
    Property: For any interaction with valid cidadao_id and pl_id,
    the database should accept the insertion.
    
    **Validates: Requirements 9.5**
    """
    with get_db_session() as db_session:
        # Create valid cidadao and projeto_lei
        cidadao = Cidadao(
            telefone_hash="valid_hash_123",
            cidade="São Paulo",
            grupo_inclusao="Mulheres",
            temas_interesse=json.dumps(["Saúde", "Educação"])
        )
        db_session.add(cidadao)
        db_session.commit()
        
        projeto_lei = ProjetoLei(
            pl_id="PL_2024_001",
            titulo="Test PL",
            tema_principal="Saúde",
            status="tramitacao"
        )
        db_session.add(projeto_lei)
        db_session.commit()
        
        # Create interaction with valid foreign keys
        interacao = Interacao(
            cidadao_id=cidadao.id,
            pl_id=projeto_lei.id,
            tipo_interacao="opiniao",
            opiniao="a_favor",
            conteudo="Test opinion",
            metadata_json=json.dumps({"cidade": "São Paulo"}),
            timestamp=datetime.utcnow()
        )
        
        db_session.add(interacao)
        db_session.commit()
        
        # Verify the interaction was successfully inserted
        saved_interacao = db_session.query(Interacao).filter_by(id=interacao.id).first()
        assert saved_interacao is not None
        assert saved_interacao.cidadao_id == cidadao.id
        assert saved_interacao.pl_id == projeto_lei.id



# Feature: voz-local-pipeline, Property 1: Interaction persistence completeness
@given(
    tipo_interacao=st.sampled_from(['opiniao', 'visualizacao', 'reacao']),
    opiniao=st.sampled_from(['a_favor', 'contra', 'pular']),
    conteudo=st.text(min_size=0, max_size=200, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00'])),
    cidade=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00'])),
    grupo_inclusao=st.sampled_from(['Mulheres', 'PCDs', 'LGBTQIA+', 'Idosos'])
)
@settings(max_examples=10, deadline=5000)
def test_interaction_persistence_completeness(tipo_interacao, opiniao, conteudo, cidade, grupo_inclusao):
    """
    Property: For any interaction data with required fields (cidadao_id, tipo_interacao, timestamp),
    persisting it to the database should result in a record containing all provided fields.
    
    **Validates: Requirements 4.1**
    """
    from src.core.processor import DataProcessor
    
    with get_db_session() as db_session:
        processor = DataProcessor(db_session)
        
        # Create a citizen first
        cidadao = Cidadao(
            telefone_hash=f"hash_{tipo_interacao}_{opiniao}",
            cidade=cidade,
            grupo_inclusao=grupo_inclusao,
            temas_interesse=json.dumps(["Saúde"])
        )
        db_session.add(cidadao)
        db_session.commit()
        
        # Create interaction data
        interaction_data = {
            'cidadao_id': cidadao.id,
            'tipo_interacao': tipo_interacao,
            'opiniao': opiniao if tipo_interacao == 'opiniao' else None,
            'conteudo': conteudo,
            'timestamp': datetime.utcnow(),
            'metadata': {
                'cidade': cidade,
                'grupo_inclusao': grupo_inclusao
            }
        }
        
        # Process interaction
        interacao = processor.process_interaction(interaction_data)
        
        # Verify all fields were persisted
        assert interacao.id is not None
        assert interacao.cidadao_id == cidadao.id
        assert interacao.tipo_interacao == tipo_interacao
        if tipo_interacao == 'opiniao':
            assert interacao.opiniao == opiniao
        assert interacao.conteudo == conteudo
        assert interacao.timestamp is not None
        assert interacao.metadata_json is not None
        
        # Verify metadata contains expected fields
        metadata = json.loads(interacao.metadata_json)
        assert metadata['cidade'] == cidade
        assert metadata['grupo_inclusao'] == grupo_inclusao



# Feature: voz-local-pipeline, Property 3: Citizen data completeness
@given(
    cidade=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00'])),
    grupo_inclusao=st.sampled_from(['Mulheres', 'PCDs', 'LGBTQIA+', 'Idosos', None]),
    temas_interesse=st.lists(st.sampled_from(['Saúde', 'Educação', 'Transporte', 'Segurança']), max_size=3)
)
@settings(max_examples=10, deadline=5000)
def test_citizen_data_completeness(cidade, grupo_inclusao, temas_interesse):
    """
    Property: For any citizen record, when stored in the database it should include
    cidade, grupo_inclusao, and temas_interesse fields.
    
    **Validates: Requirements 4.4**
    """
    from src.core.processor import DataProcessor
    
    with get_db_session() as db_session:
        processor = DataProcessor(db_session)
        
        # Create proposal data (which will create a citizen)
        proposal_data = {
            'cidadao_id': f"hash_{cidade}_{grupo_inclusao}",
            'conteudo': 'Test proposal content',
            'tipo_conteudo': 'texto',
            'cidade': cidade,
            'grupo_inclusao': grupo_inclusao,
            'timestamp': datetime.utcnow()
        }
        
        # Process proposal (this will create the citizen)
        proposta = processor.process_proposal(proposal_data)
        
        # Retrieve the citizen
        cidadao = db_session.query(Cidadao).filter_by(id=proposta.cidadao_id).first()
        
        # Verify citizen data completeness
        assert cidadao is not None
        assert cidadao.cidade is not None
        assert cidadao.cidade == cidade
        assert cidadao.grupo_inclusao == grupo_inclusao
        assert cidadao.temas_interesse is not None
        
        # Verify temas_interesse is valid JSON
        temas = json.loads(cidadao.temas_interesse)
        assert isinstance(temas, list)



# Feature: voz-local-pipeline, Property 2: Concurrent interaction persistence
@given(
    num_interactions=st.integers(min_value=2, max_value=5)
)
@settings(max_examples=10, deadline=10000)
def test_concurrent_interaction_persistence(num_interactions):
    """
    Property: For any set of interactions submitted simultaneously,
    all interactions should be persisted without data loss.
    
    **Validates: Requirements 4.2**
    """
    from src.core.processor import DataProcessor
    
    with get_db_session() as db_session:
        processor = DataProcessor(db_session)
        
        # Create a citizen
        cidadao = Cidadao(
            telefone_hash="concurrent_test_hash",
            cidade="Test City",
            grupo_inclusao="Mulheres",
            temas_interesse=json.dumps(["Saúde"])
        )
        db_session.add(cidadao)
        db_session.commit()
        
        # Create multiple interactions
        interactions = []
        for i in range(num_interactions):
            interaction_data = {
                'cidadao_id': cidadao.id,
                'tipo_interacao': 'opiniao',
                'opiniao': 'a_favor',
                'conteudo': f'Interaction {i}',
                'timestamp': datetime.utcnow(),
                'metadata': {'index': i}
            }
            interactions.append(interaction_data)
        
        # Process all interactions
        persisted_interactions = []
        for interaction_data in interactions:
            interacao = processor.process_interaction(interaction_data)
            persisted_interactions.append(interacao)
        
        # Verify all interactions were persisted
        assert len(persisted_interactions) == num_interactions
        
        # Verify all interactions have unique IDs
        interaction_ids = [i.id for i in persisted_interactions]
        assert len(set(interaction_ids)) == num_interactions
        
        # Verify all interactions are in the database
        db_count = db_session.query(Interacao).filter_by(cidadao_id=cidadao.id).count()
        assert db_count == num_interactions
