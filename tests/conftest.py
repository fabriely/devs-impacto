"""Shared test fixtures and configuration."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def test_db_engine():
    """Create a test database engine."""
    engine = create_engine("sqlite:///:memory:")
    return engine


@pytest.fixture
def test_db_session(test_db_engine):
    """Create a test database session."""
    Session = sessionmaker(bind=test_db_engine)
    session = Session()
    yield session
    session.close()
