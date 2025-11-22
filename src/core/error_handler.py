"""
Error Handler module for Voz.Local Pipeline.

This module provides error handling and retry logic with exponential backoff
for resilient operation of the data pipeline.
"""

import logging
import asyncio
import time
from typing import Callable, Any, Tuple, Type, Optional, Dict
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ErrorHandler:
    """
    Handles errors with retry logic and proper logging.
    
    This class provides:
    - Retry with exponential backoff for temporary failures
    - Structured error logging
    - Critical error notifications
    - Validation error handling
    - Database error handling with queue fallback
    """
    
    def __init__(
        self,
        max_attempts: int = 3,
        backoff_base: float = 1.0,
        backoff_multiplier: float = 2.0
    ):
        """
        Initialize the ErrorHandler.
        
        Args:
            max_attempts: Maximum number of retry attempts (default: 3)
            backoff_base: Base delay in seconds for exponential backoff (default: 1.0)
            backoff_multiplier: Multiplier for exponential backoff (default: 2.0)
        """
        self.retry_config = {
            'max_attempts': max_attempts,
            'backoff_base': backoff_base,
            'backoff_multiplier': backoff_multiplier
        }
    
    def _calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for exponential backoff.
        
        Args:
            attempt: Current attempt number (0-indexed)
            
        Returns:
            Delay in seconds
        """
        return self.retry_config['backoff_base'] * (
            self.retry_config['backoff_multiplier'] ** attempt
        )
    
    async def handle_with_retry_async(
        self,
        operation: Callable,
        error_types: Tuple[Type[Exception], ...] = (Exception,),
        operation_name: str = "operation"
    ) -> Any:
        """
        Execute an async operation with exponential backoff retry.
        
        Retry delays follow exponential backoff: 1s, 2s, 4s (with default config)
        
        Args:
            operation: Async callable to execute
            error_types: Tuple of exception types to catch and retry
            operation_name: Name of the operation for logging
            
        Returns:
            Result of the operation
            
        Raises:
            Exception: If all retry attempts fail
        """
        for attempt in range(self.retry_config['max_attempts']):
            try:
                return await operation()
            except error_types as e:
                if attempt == self.retry_config['max_attempts'] - 1:
                    # Final attempt failed - log as critical
                    logger.critical(
                        f"Permanent failure after {attempt + 1} attempts: "
                        f"operation={operation_name}, error={type(e).__name__}, "
                        f"message={str(e)}, stack_trace={self._get_stack_trace(e)}"
                    )
                    raise
                
                delay = self._calculate_delay(attempt)
                logger.warning(
                    f"Attempt {attempt + 1} failed, retrying in {delay}s: "
                    f"operation={operation_name}, error={type(e).__name__}, "
                    f"message={str(e)}"
                )
                await asyncio.sleep(delay)
    
    def handle_with_retry(
        self,
        operation: Callable,
        error_types: Tuple[Type[Exception], ...] = (Exception,),
        operation_name: str = "operation"
    ) -> Any:
        """
        Execute a synchronous operation with exponential backoff retry.
        
        Retry delays follow exponential backoff: 1s, 2s, 4s (with default config)
        
        Args:
            operation: Callable to execute
            error_types: Tuple of exception types to catch and retry
            operation_name: Name of the operation for logging
            
        Returns:
            Result of the operation
            
        Raises:
            Exception: If all retry attempts fail
            
        Example:
            >>> handler = ErrorHandler()
            >>> result = handler.handle_with_retry(
            ...     lambda: risky_operation(),
            ...     error_types=(ConnectionError, TimeoutError),
            ...     operation_name="database_connection"
            ... )
        """
        for attempt in range(self.retry_config['max_attempts']):
            try:
                return operation()
            except error_types as e:
                if attempt == self.retry_config['max_attempts'] - 1:
                    # Final attempt failed - log as critical
                    logger.critical(
                        f"Permanent failure after {attempt + 1} attempts: "
                        f"operation={operation_name}, error={type(e).__name__}, "
                        f"message={str(e)}, stack_trace={self._get_stack_trace(e)}"
                    )
                    raise
                
                delay = self._calculate_delay(attempt)
                logger.warning(
                    f"Attempt {attempt + 1} failed, retrying in {delay}s: "
                    f"operation={operation_name}, error={type(e).__name__}, "
                    f"message={str(e)}"
                )
                time.sleep(delay)
    
    def handle_validation_error(self, error: Exception, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Handle validation errors with proper logging.
        
        Args:
            error: The validation error
            context: Optional context information
            
        Returns:
            Dictionary with error details for API response
        """
        error_details = {
            'error_type': type(error).__name__,
            'message': str(error),
            'context': context or {}
        }
        
        logger.error(
            f"Validation error: error={type(error).__name__}, "
            f"message={str(error)}, context={context}"
        )
        
        return {
            "status": "error",
            "message": "Invalid input",
            "details": error_details
        }
    
    def handle_database_error(
        self,
        error: Exception,
        operation_data: Dict[str, Any],
        queue_manager: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Handle database errors with queue fallback.
        
        If a queue_manager is provided, the operation data will be queued
        for later processing when the database is available.
        
        Args:
            error: The database error
            operation_data: Data that failed to be persisted
            queue_manager: Optional TemporaryQueue instance for fallback
            
        Returns:
            Dictionary with error details and status
        """
        logger.error(
            f"Database error: error={type(error).__name__}, "
            f"message={str(error)}, stack_trace={self._get_stack_trace(error)}"
        )
        
        if queue_manager:
            try:
                queue_manager.enqueue(operation_data)
                logger.info(f"Operation queued for later processing: {operation_data.get('id', 'unknown')}")
                return {
                    "status": "queued",
                    "message": "Database unavailable, operation queued for later processing"
                }
            except Exception as queue_error:
                logger.critical(
                    f"Failed to queue operation: error={type(queue_error).__name__}, "
                    f"message={str(queue_error)}"
                )
        
        return {
            "status": "error",
            "message": "Database error occurred",
            "details": {
                'error_type': type(error).__name__,
                'message': str(error)
            }
        }
    
    def _get_stack_trace(self, error: Exception) -> str:
        """
        Get stack trace from an exception.
        
        Args:
            error: The exception
            
        Returns:
            Stack trace as string
        """
        import traceback
        return ''.join(traceback.format_exception(type(error), error, error.__traceback__))
    
    def log_error(
        self,
        error: Exception,
        component: str,
        operation: str,
        context: Optional[Dict] = None
    ) -> None:
        """
        Log an error with complete details.
        
        This ensures all errors are logged with:
        - Error type
        - Timestamp (automatic via logging)
        - Component name
        - Operation name
        - Stack trace
        - Optional context
        
        Args:
            error: The exception that occurred
            component: Name of the component where error occurred
            operation: Name of the operation that failed
            context: Optional additional context
        """
        logger.error(
            f"Pipeline error: component={component}, operation={operation}, "
            f"error={type(error).__name__}, message={str(error)}, "
            f"context={context or {}}, stack_trace={self._get_stack_trace(error)}"
        )


def with_retry(
    max_attempts: int = 3,
    backoff_base: float = 1.0,
    backoff_multiplier: float = 2.0,
    error_types: Tuple[Type[Exception], ...] = (Exception,)
):
    """
    Decorator for adding retry logic to functions.
    
    Args:
        max_attempts: Maximum number of retry attempts
        backoff_base: Base delay in seconds
        backoff_multiplier: Multiplier for exponential backoff
        error_types: Tuple of exception types to catch and retry
        
    Example:
        >>> @with_retry(max_attempts=3, error_types=(ConnectionError,))
        ... def connect_to_database():
        ...     # Connection logic here
        ...     pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            handler = ErrorHandler(max_attempts, backoff_base, backoff_multiplier)
            return handler.handle_with_retry(
                lambda: func(*args, **kwargs),
                error_types=error_types,
                operation_name=func.__name__
            )
        return wrapper
    return decorator
