"""
Temporary Queue module for Voz.Local Pipeline.

This module provides a file-based queue for storing operations when the database
is unavailable, ensuring no data loss during temporary outages.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Callable, Optional
from filelock import FileLock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TemporaryQueue:
    """
    File-based queue for storing operations during database unavailability.
    
    This class provides:
    - Persistent storage of failed operations
    - Automatic retry when database recovers
    - Thread-safe file operations
    - Corruption handling
    """
    
    def __init__(self, queue_file: str = 'data/temp_queue.jsonl'):
        """
        Initialize the TemporaryQueue.
        
        Args:
            queue_file: Path to the queue file (default: data/temp_queue.jsonl)
        """
        self.queue_file = Path(queue_file)
        self.lock_file = Path(str(queue_file) + '.lock')
        
        # Create directory if it doesn't exist
        self.queue_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"TemporaryQueue initialized: {self.queue_file}")
    
    def enqueue(self, data: Dict[str, Any]) -> None:
        """
        Add data to the queue.
        
        Args:
            data: Dictionary containing operation data to queue
            
        Example:
            >>> queue = TemporaryQueue()
            >>> queue.enqueue({
            ...     'type': 'interaction',
            ...     'cidadao_id': 123,
            ...     'data': {...}
            ... })
        """
        try:
            # Use file lock for thread safety
            with FileLock(str(self.lock_file), timeout=10):
                with open(self.queue_file, 'a', encoding='utf-8') as f:
                    entry = {
                        'data': data,
                        'queued_at': datetime.utcnow().isoformat(),
                        'attempts': 0
                    }
                    f.write(json.dumps(entry) + '\n')
            
            logger.info(f"Operation queued: type={data.get('type', 'unknown')}")
            
        except Exception as e:
            logger.error(f"Failed to enqueue operation: {e}")
            raise
    
    def process_queue(
        self,
        processor: Callable[[Dict[str, Any]], None],
        max_attempts: int = 3
    ) -> Dict[str, int]:
        """
        Process all queued items using the provided processor function.
        
        Args:
            processor: Function that processes a single queued item
            max_attempts: Maximum number of processing attempts per item
            
        Returns:
            Dictionary with counts: {'processed': N, 'failed': M, 'remaining': K}
            
        Example:
            >>> queue = TemporaryQueue()
            >>> def process_item(data):
            ...     # Process the data
            ...     save_to_database(data)
            >>> 
            >>> results = queue.process_queue(process_item)
            >>> print(f"Processed {results['processed']} items")
        """
        if not self.queue_file.exists():
            logger.info("Queue file does not exist, nothing to process")
            return {'processed': 0, 'failed': 0, 'remaining': 0}
        
        processed = []
        failed = []
        
        try:
            # Use file lock for thread safety
            with FileLock(str(self.lock_file), timeout=10):
                # Read all entries
                with open(self.queue_file, 'r', encoding='utf-8') as f:
                    entries = []
                    for line_num, line in enumerate(f, 1):
                        try:
                            entry = json.loads(line.strip())
                            entries.append(entry)
                        except json.JSONDecodeError as e:
                            logger.warning(
                                f"Corrupted queue entry at line {line_num}: {e}. "
                                f"Skipping this entry."
                            )
                            # Corrupted data is isolated and skipped
                            continue
                
                # Process each entry
                for entry in entries:
                    try:
                        processor(entry['data'])
                        processed.append(entry)
                        logger.info(
                            f"Processed queued item: type={entry['data'].get('type', 'unknown')}"
                        )
                    except Exception as e:
                        entry['attempts'] += 1
                        entry['last_error'] = str(e)
                        
                        if entry['attempts'] < max_attempts:
                            failed.append(entry)
                            logger.warning(
                                f"Failed to process queued item (attempt {entry['attempts']}): {e}"
                            )
                        else:
                            logger.error(
                                f"Permanently failed to process queued item after "
                                f"{entry['attempts']} attempts: {e}"
                            )
                
                # Rewrite queue with only failed items
                with open(self.queue_file, 'w', encoding='utf-8') as f:
                    for entry in failed:
                        f.write(json.dumps(entry) + '\n')
            
            logger.info(
                f"Queue processing complete: processed={len(processed)}, "
                f"failed={len(failed)}, remaining={len(failed)}"
            )
            
            return {
                'processed': len(processed),
                'failed': len(failed),
                'remaining': len(failed)
            }
            
        except Exception as e:
            logger.error(f"Error processing queue: {e}")
            raise
    
    def get_queue_size(self) -> int:
        """
        Get the number of items currently in the queue.
        
        Returns:
            Number of queued items
        """
        if not self.queue_file.exists():
            return 0
        
        try:
            with FileLock(str(self.lock_file), timeout=10):
                with open(self.queue_file, 'r', encoding='utf-8') as f:
                    return sum(1 for _ in f)
        except Exception as e:
            logger.error(f"Error getting queue size: {e}")
            return 0
    
    def clear_queue(self) -> None:
        """
        Clear all items from the queue.
        
        WARNING: This will delete all queued operations!
        """
        try:
            with FileLock(str(self.lock_file), timeout=10):
                if self.queue_file.exists():
                    self.queue_file.unlink()
                    logger.info("Queue cleared")
        except Exception as e:
            logger.error(f"Error clearing queue: {e}")
            raise
    
    def peek_queue(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Peek at the first N items in the queue without removing them.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of queued items
        """
        if not self.queue_file.exists():
            return []
        
        try:
            with FileLock(str(self.lock_file), timeout=10):
                with open(self.queue_file, 'r', encoding='utf-8') as f:
                    items = []
                    for i, line in enumerate(f):
                        if i >= limit:
                            break
                        try:
                            entry = json.loads(line.strip())
                            items.append(entry)
                        except json.JSONDecodeError:
                            continue
                    return items
        except Exception as e:
            logger.error(f"Error peeking queue: {e}")
            return []
