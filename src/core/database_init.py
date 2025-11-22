"""
Database initialization module for Voz.Local Pipeline.

This module provides functions to initialize the SQLite database with all
required tables and indexes.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
import logging

from src.models.database import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database(database_url: str = None, enable_foreign_keys: bool = True) -> tuple:
    """
    Initialize the database with all required tables and indexes.
    
    This function:
    1. Creates the database file if it doesn't exist
    2. Enables foreign key constraints (for SQLite)
    3. Creates all tables defined in the SQLAlchemy models
    4. Creates all indexes for performance optimization
    
    Args:
        database_url: Database connection string. If None, uses default SQLite database
                     at data/voz_local.db
        enable_foreign_keys: Whether to enable foreign key constraints (default: True)
    
    Returns:
        tuple: (engine, Session) - SQLAlchemy engine and Session class
    
    Raises:
        Exception: If database initialization fails
    
    Example:
        >>> engine, Session = init_database()
        >>> session = Session()
        >>> # Use session for database operations
        >>> session.close()
    """
    try:
        # Use default database URL if not provided
        if database_url is None:
            # Create data directory if it doesn't exist
            data_dir = Path("data")
            data_dir.mkdir(exist_ok=True)
            database_url = f"sqlite:///{data_dir}/voz_local.db"
        
        logger.info(f"Initializing database at: {database_url}")
        
        # Create engine
        engine = create_engine(database_url, echo=False)
        
        # Enable foreign key constraints for SQLite
        if enable_foreign_keys and database_url.startswith("sqlite"):
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
            
            logger.info("Foreign key constraints enabled for SQLite")
        
        # Create all tables
        Base.metadata.create_all(engine)
        logger.info("Database tables created successfully")
        
        # Log created tables
        table_names = Base.metadata.tables.keys()
        logger.info(f"Created tables: {', '.join(table_names)}")
        
        # Create Session class
        Session = sessionmaker(bind=engine)
        
        logger.info("Database initialization completed successfully")
        
        return engine, Session
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


def drop_all_tables(database_url: str = None):
    """
    Drop all tables from the database.
    
    WARNING: This will delete all data in the database!
    Use with caution, typically only for testing or development.
    
    Args:
        database_url: Database connection string. If None, uses default SQLite database
    
    Example:
        >>> drop_all_tables()  # Drops all tables from default database
    """
    try:
        if database_url is None:
            data_dir = Path("data")
            database_url = f"sqlite:///{data_dir}/voz_local.db"
        
        logger.warning(f"Dropping all tables from: {database_url}")
        
        engine = create_engine(database_url, echo=False)
        Base.metadata.drop_all(engine)
        engine.dispose()  # Release file locks
        
        logger.info("All tables dropped successfully")
        
    except Exception as e:
        logger.error(f"Failed to drop tables: {e}")
        raise


def reset_database(database_url: str = None):
    """
    Reset the database by dropping all tables and recreating them.
    
    WARNING: This will delete all data in the database!
    Use with caution, typically only for testing or development.
    
    Args:
        database_url: Database connection string. If None, uses default SQLite database
    
    Returns:
        tuple: (engine, Session) - SQLAlchemy engine and Session class
    
    Example:
        >>> engine, Session = reset_database()
        >>> # Database is now empty with fresh schema
    """
    logger.warning("Resetting database - all data will be lost!")
    drop_all_tables(database_url)
    return init_database(database_url)


if __name__ == "__main__":
    """
    Run this script directly to initialize the database.
    
    Usage:
        python -m src.core.database_init
    """
    print("=" * 60)
    print("Voz.Local Pipeline - Database Initialization")
    print("=" * 60)
    print()
    
    # Initialize database
    engine, Session = init_database()
    
    print()
    print("Database initialized successfully!")
    print()
    print("You can now:")
    print("  1. Run the FastAPI server: uvicorn src.api.main:app --reload")
    print("  2. Run the Streamlit dashboard: streamlit run src/dashboard/app.py")
    print()
