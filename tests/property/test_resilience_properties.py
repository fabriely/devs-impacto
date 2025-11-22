"""
Property-based tests for resilience and error handling properties.

These tests verify universal properties related to error handling,
retry logic, and system resilience.
"""

import pytest
from hypothesis import given, strategies as st, settings
import time
import logging
import json
from unittest.mock import Mock, patch
from io import StringIO
from pathlib import Path

from src.core.error_handler import ErrorHandler, with_retry


# Feature: voz-local-pipeline, Property 21: Retry with exponential backoff
@given(
    num_failures=st.integers(min_value=1, max_value=2)
)
@settings(max_examples=10, deadline=10000)
def test_retry_with_exponential_backoff(num_failures):
    """
    Property: For any temporary failure, the system should retry exactly 3 times
    with exponentially increasing delays (e.g., 1s, 2s, 4s).
    
    **Validates: Requirements 1.5, 4.3, 7.2**
    """
    handler = ErrorHandler(max_attempts=3, backoff_base=1.0, backoff_multiplier=2.0)
    
    # Track call times
    call_times = []
    call_count = [0]
    
    def failing_operation():
        call_times.append(time.time())
        call_count[0] += 1
        if call_count[0] <= num_failures:
            raise ConnectionError(f"Temporary failure {call_count[0]}")
        return "success"
    
    # Execute with retry
    result = handler.handle_with_retry(
        failing_operation,
        error_types=(ConnectionError,),
        operation_name="test_operation"
    )
    
    # Verify success after retries
    assert result == "success"
    assert call_count[0] == num_failures + 1
    
    # Verify exponential backoff delays
    if len(call_times) > 1:
        for i in range(1, len(call_times)):
            delay = call_times[i] - call_times[i-1]
            expected_delay = 1.0 * (2.0 ** (i-1))
            # Allow 0.5s tolerance for timing variations
            assert delay >= expected_delay - 0.5
            assert delay <= expected_delay + 0.5


# Feature: voz-local-pipeline, Property 21: Retry with exponential backoff
def test_retry_exhausts_after_max_attempts():
    """
    Property: After 3 failed attempts, the system should raise the exception
    and log it as critical.
    
    **Validates: Requirements 1.5, 4.3, 7.2**
    """
    handler = ErrorHandler(max_attempts=3, backoff_base=0.1, backoff_multiplier=2.0)
    
    call_count = [0]
    
    def always_failing_operation():
        call_count[0] += 1
        raise ConnectionError(f"Failure {call_count[0]}")
    
    # Verify exception is raised after max attempts
    with pytest.raises(ConnectionError):
        handler.handle_with_retry(
            always_failing_operation,
            error_types=(ConnectionError,),
            operation_name="test_operation"
        )
    
    # Verify exactly 3 attempts were made
    assert call_count[0] == 3


# Feature: voz-local-pipeline, Property 21: Retry with exponential backoff
@given(
    backoff_base=st.floats(min_value=0.1, max_value=2.0),
    backoff_multiplier=st.floats(min_value=1.5, max_value=3.0)
)
@settings(max_examples=5, deadline=10000)
def test_retry_respects_custom_backoff_config(backoff_base, backoff_multiplier):
    """
    Property: The retry mechanism should respect custom backoff configuration.
    
    **Validates: Requirements 1.5, 4.3, 7.2**
    """
    handler = ErrorHandler(
        max_attempts=2,
        backoff_base=backoff_base,
        backoff_multiplier=backoff_multiplier
    )
    
    call_times = []
    call_count = [0]
    
    def failing_once():
        call_times.append(time.time())
        call_count[0] += 1
        if call_count[0] == 1:
            raise ConnectionError("First failure")
        return "success"
    
    result = handler.handle_with_retry(
        failing_once,
        error_types=(ConnectionError,),
        operation_name="test_operation"
    )
    
    assert result == "success"
    
    # Verify delay matches configuration
    if len(call_times) == 2:
        delay = call_times[1] - call_times[0]
        expected_delay = backoff_base
        # Allow 0.5s tolerance
        assert delay >= expected_delay - 0.5
        assert delay <= expected_delay + 0.5


# Feature: voz-local-pipeline, Property 21: Retry with exponential backoff
def test_retry_decorator():
    """
    Property: The @with_retry decorator should provide the same retry behavior.
    
    **Validates: Requirements 1.5, 4.3, 7.2**
    """
    call_count = [0]
    
    @with_retry(max_attempts=3, backoff_base=0.1, error_types=(ValueError,))
    def decorated_function():
        call_count[0] += 1
        if call_count[0] < 2:
            raise ValueError("Temporary error")
        return "success"
    
    result = decorated_function()
    
    assert result == "success"
    assert call_count[0] == 2



# Feature: voz-local-pipeline, Property 22: Error logging completeness
@given(
    component=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00'])),
    operation=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00'])),
    error_message=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00']))
)
@settings(max_examples=10, deadline=5000)
def test_error_logging_completeness(component, operation, error_message):
    """
    Property: For any pipeline failure, the system should log an entry containing
    error type, timestamp, component name, and stack trace.
    
    **Validates: Requirements 7.1**
    """
    handler = ErrorHandler()
    
    # Create a test error
    test_error = ValueError(error_message)
    
    # Capture log output
    with patch('src.core.error_handler.logger') as mock_logger:
        handler.log_error(
            error=test_error,
            component=component,
            operation=operation,
            context={'test': 'context'}
        )
        
        # Verify logger.error was called
        assert mock_logger.error.called
        
        # Get the logged message
        log_call = mock_logger.error.call_args[0][0]
        
        # Verify all required fields are present in the log
        assert f"component={component}" in log_call
        assert f"operation={operation}" in log_call
        assert "error=ValueError" in log_call
        assert error_message in log_call
        assert "stack_trace=" in log_call
        assert "context=" in log_call


# Feature: voz-local-pipeline, Property 22: Error logging completeness
def test_error_logging_includes_stack_trace():
    """
    Property: Error logs should always include a stack trace.
    
    **Validates: Requirements 7.1**
    """
    handler = ErrorHandler()
    
    # Create an error with a stack trace
    try:
        raise RuntimeError("Test error with stack trace")
    except RuntimeError as e:
        test_error = e
    
    with patch('src.core.error_handler.logger') as mock_logger:
        handler.log_error(
            error=test_error,
            component="test_component",
            operation="test_operation"
        )
        
        log_call = mock_logger.error.call_args[0][0]
        
        # Verify stack trace is present and contains traceback info
        assert "stack_trace=" in log_call
        assert "Traceback" in log_call or "RuntimeError" in log_call



# Feature: voz-local-pipeline, Property 23: Critical error notification
@given(
    error_message=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',), blacklist_characters=['\x00']))
)
@settings(max_examples=10, deadline=5000)
def test_critical_error_notification(error_message):
    """
    Property: For any permanent failure (after 3 retries), the system should
    log an entry with level 'CRITICAL'.
    
    **Validates: Requirements 7.3**
    """
    handler = ErrorHandler(max_attempts=3, backoff_base=0.1, backoff_multiplier=2.0)
    
    def always_failing():
        raise RuntimeError(error_message)
    
    # Capture log output
    with patch('src.core.error_handler.logger') as mock_logger:
        try:
            handler.handle_with_retry(
                always_failing,
                error_types=(RuntimeError,),
                operation_name="test_operation"
            )
        except RuntimeError:
            pass  # Expected to fail
        
        # Verify logger.critical was called
        assert mock_logger.critical.called
        
        # Get the critical log message
        critical_call = mock_logger.critical.call_args[0][0]
        
        # Verify it contains "Permanent failure"
        assert "Permanent failure" in critical_call
        assert "after 3 attempts" in critical_call
        assert error_message in critical_call


# Feature: voz-local-pipeline, Property 23: Critical error notification
def test_critical_error_not_logged_on_success():
    """
    Property: Critical errors should only be logged when all retries are exhausted.
    
    **Validates: Requirements 7.3**
    """
    handler = ErrorHandler(max_attempts=3, backoff_base=0.1, backoff_multiplier=2.0)
    
    call_count = [0]
    
    def succeeds_on_second_try():
        call_count[0] += 1
        if call_count[0] == 1:
            raise RuntimeError("Temporary failure")
        return "success"
    
    with patch('src.core.error_handler.logger') as mock_logger:
        result = handler.handle_with_retry(
            succeeds_on_second_try,
            error_types=(RuntimeError,),
            operation_name="test_operation"
        )
        
        # Verify success
        assert result == "success"
        
        # Verify logger.critical was NOT called
        assert not mock_logger.critical.called
        
        # Verify logger.warning was called (for the retry)
        assert mock_logger.warning.called



# Feature: voz-local-pipeline, Property 24: Queue persistence on database unavailability
@given(
    num_operations=st.integers(min_value=1, max_value=5)
)
@settings(max_examples=10, deadline=5000)
def test_queue_persistence_on_database_unavailability(num_operations):
    """
    Property: For any interaction received when the database is unavailable,
    the system should store it in a temporary queue.
    
    **Validates: Requirements 4.5**
    """
    from src.utils.queue import TemporaryQueue
    import tempfile
    import os
    
    # Create a temporary queue file
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = Path(tmpdir) / "test_queue.jsonl"
        queue = TemporaryQueue(str(queue_file))
        
        # Enqueue multiple operations
        operations = []
        for i in range(num_operations):
            operation = {
                'type': 'interaction',
                'id': i,
                'data': f'operation_{i}'
            }
            queue.enqueue(operation)
            operations.append(operation)
        
        # Verify all operations were queued
        assert queue.get_queue_size() == num_operations
        
        # Verify queue file exists
        assert queue_file.exists()
        
        # Peek at queued items
        queued_items = queue.peek_queue(limit=num_operations)
        assert len(queued_items) == num_operations
        
        # Verify data integrity
        for i, item in enumerate(queued_items):
            assert item['data']['id'] == i
            assert item['data']['type'] == 'interaction'
            assert 'queued_at' in item
            assert item['attempts'] == 0



# Feature: voz-local-pipeline, Property 25: Queue processing after recovery
@given(
    num_operations=st.integers(min_value=1, max_value=5)
)
@settings(max_examples=10, deadline=5000)
def test_queue_processing_after_recovery(num_operations):
    """
    Property: For any system restart with pending items in the temporary queue,
    all queued items should be processed and persisted.
    
    **Validates: Requirements 7.4**
    """
    from src.utils.queue import TemporaryQueue
    import tempfile
    
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = Path(tmpdir) / "test_queue.jsonl"
        queue = TemporaryQueue(str(queue_file))
        
        # Enqueue operations
        for i in range(num_operations):
            operation = {
                'type': 'interaction',
                'id': i,
                'data': f'operation_{i}'
            }
            queue.enqueue(operation)
        
        # Verify items are queued
        assert queue.get_queue_size() == num_operations
        
        # Process queue with a mock processor
        processed_items = []
        
        def processor(data):
            processed_items.append(data)
        
        results = queue.process_queue(processor)
        
        # Verify all items were processed
        assert results['processed'] == num_operations
        assert results['failed'] == 0
        assert results['remaining'] == 0
        assert len(processed_items) == num_operations
        
        # Verify queue is now empty
        assert queue.get_queue_size() == 0
        
        # Verify data integrity
        for i, item in enumerate(processed_items):
            assert item['id'] == i
            assert item['type'] == 'interaction'



# Feature: voz-local-pipeline, Property 26: Corrupted data isolation
@given(
    num_valid=st.integers(min_value=1, max_value=3),
    num_corrupted=st.integers(min_value=1, max_value=2)
)
@settings(max_examples=10, deadline=5000)
def test_corrupted_data_isolation(num_valid, num_corrupted):
    """
    Property: For any batch of data containing corrupted records, the system should
    persist valid records and isolate corrupted ones without stopping processing.
    
    **Validates: Requirements 7.5**
    """
    from src.utils.queue import TemporaryQueue
    import tempfile
    
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = Path(tmpdir) / "test_queue.jsonl"
        
        # Manually create a queue file with valid and corrupted entries
        with open(queue_file, 'w', encoding='utf-8') as f:
            # Write valid entries
            for i in range(num_valid):
                entry = {
                    'data': {'type': 'valid', 'id': i},
                    'queued_at': '2024-01-01T00:00:00',
                    'attempts': 0
                }
                f.write(json.dumps(entry) + '\n')
            
            # Write corrupted entries (invalid JSON)
            for i in range(num_corrupted):
                f.write('{ invalid json data }\n')
        
        # Create queue and process
        queue = TemporaryQueue(str(queue_file))
        
        processed_items = []
        
        def processor(data):
            processed_items.append(data)
        
        results = queue.process_queue(processor)
        
        # Verify only valid items were processed
        assert results['processed'] == num_valid
        assert len(processed_items) == num_valid
        
        # Verify corrupted data was isolated (skipped)
        for item in processed_items:
            assert item['type'] == 'valid'
        
        # Verify queue is empty after processing (corrupted entries were skipped)
        assert queue.get_queue_size() == 0


# Feature: voz-local-pipeline, Property 26: Corrupted data isolation
def test_corrupted_data_does_not_stop_processing():
    """
    Property: Corrupted data should not prevent processing of subsequent valid data.
    
    **Validates: Requirements 7.5**
    """
    from src.utils.queue import TemporaryQueue
    import tempfile
    import json
    
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = Path(tmpdir) / "test_queue.jsonl"
        
        # Create queue file with: valid, corrupted, valid pattern
        with open(queue_file, 'w', encoding='utf-8') as f:
            # Valid entry 1
            f.write(json.dumps({
                'data': {'id': 1, 'type': 'valid'},
                'queued_at': '2024-01-01T00:00:00',
                'attempts': 0
            }) + '\n')
            
            # Corrupted entry
            f.write('{ corrupted json\n')
            
            # Valid entry 2
            f.write(json.dumps({
                'data': {'id': 2, 'type': 'valid'},
                'queued_at': '2024-01-01T00:00:00',
                'attempts': 0
            }) + '\n')
        
        queue = TemporaryQueue(str(queue_file))
        
        processed_items = []
        
        def processor(data):
            processed_items.append(data)
        
        results = queue.process_queue(processor)
        
        # Verify both valid items were processed despite corrupted entry in between
        assert results['processed'] == 2
        assert len(processed_items) == 2
        assert processed_items[0]['id'] == 1
        assert processed_items[1]['id'] == 2
