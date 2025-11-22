"""
Unit tests for database initialization.
"""

import pytest
import tempfile
import os
from pathlib import Path
from sqlalchemy import inspect

from src.core.database_init import init_database, drop_all_tables, reset_database
from src.models.database import Cidadao, ProjetoLei, Interacao, PropostaPauta, MetricaLacuna


def test_init_database_creates_all_tables():
    """Test that init_database creates all required tables."""
    # Use a temporary database
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        database_url = f"sqlite:///{db_path}"
        
        # Initialize database
        engine, Session = init_database(database_url)
        
        try:
            # Verify all tables were created
            inspector = inspect(engine)
            table_names = inspector.get_table_names()
            
            assert 'cidadaos' in table_names
            assert 'projetos_lei' in table_names
            assert 'interacoes' in table_names
            assert 'propostas_pauta' in table_names
            assert 'metricas_lacuna' in table_names
            
            # Verify we can create a session
            session = Session()
            assert session is not None
            session.close()
        finally:
            # Dispose of the engine to release file locks
            engine.dispose()


def test_init_database_creates_indexes():
    """Test that init_database creates all required indexes."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        database_url = f"sqlite:///{db_path}"
        
        engine, Session = init_database(database_url)
        
        try:
            inspector = inspect(engine)
            
            # Check indexes on interacoes table
            interacoes_indexes = inspector.get_indexes('interacoes')
            index_names = [idx['name'] for idx in interacoes_indexes]
            
            assert 'idx_interacoes_cidadao' in index_names
            assert 'idx_interacoes_pl' in index_names
            assert 'idx_interacoes_timestamp' in index_names
            
            # Check indexes on propostas_pauta table
            propostas_indexes = inspector.get_indexes('propostas_pauta')
            index_names = [idx['name'] for idx in propostas_indexes]
            
            assert 'idx_propostas_tema' in index_names
            assert 'idx_propostas_cidade' in index_names
            assert 'idx_propostas_grupo' in index_names
            assert 'idx_propostas_timestamp' in index_names
        finally:
            engine.dispose()


def test_init_database_enables_foreign_keys():
    """Test that foreign key constraints are enabled."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        database_url = f"sqlite:///{db_path}"
        
        engine, Session = init_database(database_url, enable_foreign_keys=True)
        session = Session()
        
        try:
            # Try to insert an interaction with invalid cidadao_id
            # This should fail if foreign keys are enabled
            from sqlalchemy.exc import IntegrityError
            from datetime import datetime
            import json
            
            interacao = Interacao(
                cidadao_id=99999,  # Non-existent cidadao
                tipo_interacao="opiniao",
                opiniao="a_favor",
                metadata_json=json.dumps({}),
                timestamp=datetime.utcnow()
            )
            
            session.add(interacao)
            
            with pytest.raises(IntegrityError):
                session.commit()
            
            session.rollback()
        finally:
            session.close()
            engine.dispose()


def test_reset_database():
    """Test that reset_database drops and recreates tables."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        database_url = f"sqlite:///{db_path}"
        
        # Initialize database and add some data
        engine, Session = init_database(database_url)
        session = Session()
        
        try:
            cidadao = Cidadao(
                telefone_hash="test_hash",
                cidade="Test City",
                grupo_inclusao="Test Group"
            )
            session.add(cidadao)
            session.commit()
            
            # Verify data exists
            count_before = session.query(Cidadao).count()
            assert count_before == 1
        finally:
            session.close()
            engine.dispose()
        
        # Reset database
        engine, Session = reset_database(database_url)
        session = Session()
        
        try:
            # Verify data was deleted
            count_after = session.query(Cidadao).count()
            assert count_after == 0
        finally:
            session.close()
            engine.dispose()


def test_init_database_with_default_path():
    """Test that init_database works with default path."""
    # This test uses the actual data directory
    # Clean up any existing database first
    data_dir = Path("data")
    db_file = data_dir / "voz_local.db"
    
    # Initialize database
    engine, Session = init_database()
    
    # Verify database file exists
    assert db_file.exists()
    
    # Verify we can create a session
    session = Session()
    assert session is not None
    session.close()
