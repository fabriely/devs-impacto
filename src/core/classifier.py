"""
AI Classifier module for Voz.Local Pipeline.

This module uses OpenAI's GPT-4 and embeddings to classify citizen proposals
by theme and detect similar proposals.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from openai import OpenAI
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Define valid themes for classification
TEMAS = [
    "Saúde",
    "Educação",
    "Transporte",
    "Segurança",
    "Meio Ambiente",
    "Habitação",
    "Cultura",
    "Esporte",
    "Assistência Social",
    "Infraestrutura",
    "Outros"
]


class ClassificationResult:
    """
    Result of a theme classification operation.
    
    Attributes:
        tema_principal: Main theme identified
        temas_secundarios: List of secondary themes
        confidence_score: Confidence score (0.0 to 1.0)
        needs_review: Whether manual review is needed
    """
    
    def __init__(
        self,
        tema_principal: str,
        temas_secundarios: List[str],
        confidence_score: float,
        needs_review: bool = False
    ):
        self.tema_principal = tema_principal
        self.temas_secundarios = temas_secundarios
        self.confidence_score = confidence_score
        self.needs_review = needs_review
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'tema_principal': self.tema_principal,
            'temas_secundarios': self.temas_secundarios,
            'confidence_score': self.confidence_score,
            'needs_review': self.needs_review
        }


class AIClassifier:
    """
    AI-powered classifier for citizen proposals.
    
    This class uses OpenAI's GPT-4 for theme classification and
    embeddings for similarity detection.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the AIClassifier.
        
        Args:
            api_key: OpenAI API key. If None, reads from OPENAI_API_KEY env var
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        self.client = OpenAI(api_key=self.api_key)
        self.temas = TEMAS
        
        logger.info("AIClassifier initialized")
    
    def classify_theme(self, conteudo: str) -> ClassificationResult:
        """
        Classify the theme of a citizen proposal using GPT-4.
        
        Args:
            conteudo: Text content of the proposal
            
        Returns:
            ClassificationResult with theme classification and confidence
            
        Example:
            >>> classifier = AIClassifier()
            >>> result = classifier.classify_theme(
            ...     "Precisamos de mais creches no bairro"
            ... )
            >>> print(result.tema_principal)
            'Educação'
        """
        try:
            # Create prompt for GPT-4
            prompt = f"""Você é um assistente que classifica propostas legislativas por tema.

Temas válidos: {', '.join(self.temas)}

Analise a seguinte proposta e:
1. Identifique o tema principal
2. Identifique até 2 temas secundários (se houver)
3. Forneça um score de confiança (0.0 a 1.0)

Proposta: "{conteudo}"

Responda APENAS no formato JSON:
{{
    "tema_principal": "tema",
    "temas_secundarios": ["tema1", "tema2"],
    "confidence_score": 0.95
}}"""
            
            # Call GPT-4
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Você é um classificador de propostas legislativas."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            # Parse response
            import json
            result_text = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
            
            result_data = json.loads(result_text)
            
            # Validate tema_principal is in TEMAS
            tema_principal = result_data.get('tema_principal', 'Outros')
            if tema_principal not in self.temas:
                logger.warning(f"Invalid tema_principal '{tema_principal}', defaulting to 'Outros'")
                tema_principal = 'Outros'
            
            # Validate temas_secundarios
            temas_secundarios = result_data.get('temas_secundarios', [])
            temas_secundarios = [t for t in temas_secundarios if t in self.temas]
            
            confidence_score = float(result_data.get('confidence_score', 0.5))
            
            # Flag for manual review if confidence is low
            needs_review = confidence_score < 0.6
            
            result = ClassificationResult(
                tema_principal=tema_principal,
                temas_secundarios=temas_secundarios,
                confidence_score=confidence_score,
                needs_review=needs_review
            )
            
            logger.info(
                f"Classified proposal: tema={tema_principal}, "
                f"confidence={confidence_score:.2f}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error classifying theme: {e}")
            # Return default classification on error
            return ClassificationResult(
                tema_principal='Outros',
                temas_secundarios=[],
                confidence_score=0.0,
                needs_review=True
            )
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Get embedding vector for text using OpenAI's embedding model.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score (0.0 to 1.0)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        return (similarity + 1) / 2
    
    def detect_similarity(self, proposal1: str, proposal2: str) -> float:
        """
        Calculate semantic similarity between two proposals.
        
        Args:
            proposal1: First proposal text
            proposal2: Second proposal text
            
        Returns:
            Similarity score (0.0 to 1.0)
            
        Example:
            >>> classifier = AIClassifier()
            >>> similarity = classifier.detect_similarity(
            ...     "Precisamos de mais creches",
            ...     "Faltam creches no bairro"
            ... )
            >>> print(f"Similarity: {similarity:.2f}")
        """
        try:
            # Get embeddings for both proposals
            embedding1 = self.get_embedding(proposal1)
            embedding2 = self.get_embedding(proposal2)
            
            # Calculate similarity
            similarity = self.calculate_similarity(embedding1, embedding2)
            
            logger.info(f"Similarity calculated: {similarity:.2f}")
            
            return similarity
            
        except Exception as e:
            logger.error(f"Error detecting similarity: {e}")
            return 0.0
    
    def find_similar_proposals(
        self,
        proposal: str,
        existing_proposals: List[Tuple[int, str]],
        threshold: float = 0.85
    ) -> List[Tuple[int, float]]:
        """
        Find proposals similar to the given proposal.
        
        Args:
            proposal: The proposal text to compare
            existing_proposals: List of (id, text) tuples for existing proposals
            threshold: Similarity threshold (default: 0.85)
            
        Returns:
            List of (proposal_id, similarity_score) tuples for similar proposals
            
        Example:
            >>> classifier = AIClassifier()
            >>> existing = [(1, "Mais creches"), (2, "Mais hospitais")]
            >>> similar = classifier.find_similar_proposals(
            ...     "Precisamos de creches",
            ...     existing,
            ...     threshold=0.85
            ... )
        """
        try:
            # Get embedding for the new proposal
            proposal_embedding = self.get_embedding(proposal)
            
            similar_proposals = []
            
            for prop_id, prop_text in existing_proposals:
                # Get embedding for existing proposal
                existing_embedding = self.get_embedding(prop_text)
                
                # Calculate similarity
                similarity = self.calculate_similarity(proposal_embedding, existing_embedding)
                
                # Add to results if above threshold
                if similarity >= threshold:
                    similar_proposals.append((prop_id, similarity))
            
            # Sort by similarity (highest first)
            similar_proposals.sort(key=lambda x: x[1], reverse=True)
            
            logger.info(
                f"Found {len(similar_proposals)} similar proposals "
                f"(threshold={threshold})"
            )
            
            return similar_proposals
            
        except Exception as e:
            logger.error(f"Error finding similar proposals: {e}")
            return []
