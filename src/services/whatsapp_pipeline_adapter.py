"""
WhatsApp Pipeline Adapter

This module bridges the WhatsApp Baileys Controller (TypeScript) with the FastAPI Pipeline (Python).

When a user completes a conversation in WhatsApp (registers an opinion or proposal),
this adapter is called to persist the data to the database via the FastAPI endpoints.

Flow:
1. BaileysWhatsAppController (TS) detects opinion/proposal
2. Calls this adapter via HTTP POST or through a message queue
3. Adapter maps WhatsApp user to Cidadao record
4. Calls FastAPI endpoints to persist data
5. Data is saved to database
6. Dashboard reads updated metrics
"""

import logging
import os
import json
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import requests
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InteracaoTipo(str, Enum):
    """Tipos de interação suportados."""
    OPINIAO = "opiniao"
    VISUALIZACAO = "visualizacao"
    REACAO = "reacao"


class PropostaTipo(str, Enum):
    """Tipos de proposta suportados."""
    TEXTO = "texto"
    AUDIO_TRANSCRITO = "audio_transcrito"


class WhatsAppPipelineAdapter:
    """
    Adapter que integra o WhatsApp Baileys Controller com a Pipeline FastAPI.
    
    Responsabilidades:
    - Mapear usuários WhatsApp para cidadãos no banco de dados
    - Converter eventos WhatsApp em requisições da API
    - Gerenciar tentativas de reconexão e tratamento de erros
    - Logs detalhados de sincronização
    """
    
    def __init__(self, api_base_url: str = None):
        """
        Inicializa o adapter.
        
        Args:
            api_base_url: URL base da API FastAPI (default: localhost:8000)
        """
        self.api_base_url = api_base_url or os.getenv(
            "PIPELINE_API_URL",
            "http://localhost:8000"
        )
        
        # Cache de mapeamento WhatsApp -> Cidadao ID
        # Formato: {"5511999999999": {"cidadao_id": 123, "timestamp": "2025-11-22T10:00:00"}}
        self._phone_to_cidadao_cache: Dict[str, Dict[str, Any]] = {}
        
        logger.info(f"✅ WhatsAppPipelineAdapter inicializado com API: {self.api_base_url}")
    
    # ========== Métodos de Mapeamento de Usuário ==========
    
    def _hash_phone(self, phone_number: str) -> str:
        """
        Cria hash criptográfico de um número de telefone.
        
        Args:
            phone_number: Número de telefone (ex: 5511999999999)
            
        Returns:
            Hash SHA256 do telefone
        """
        return hashlib.sha256(phone_number.encode()).hexdigest()
    
    def normalize_phone_number(self, phone_number: str) -> str:
        """
        Normaliza número de telefone.
        
        Remove caracteres especiais e garante formato único.
        
        Args:
            phone_number: Número bruto (pode ter @s.whatsapp.net, @lid, espaços, etc)
            
        Returns:
            Número normalizado (ex: 5511999999999)
        """
        # Remove JID markers
        phone = phone_number.replace('@s.whatsapp.net', '').replace('@lid', '')
        
        # Remove espaços e caracteres especiais
        phone = ''.join(c for c in phone if c.isdigit())
        
        return phone
    
    def get_or_create_cidadao(
        self,
        phone_number: str,
        cidade: str = "Desconhecida",
        grupo_inclusao: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtém ou cria um cidadão baseado no número de telefone.
        
        Args:
            phone_number: Número WhatsApp (5511999999999)
            cidade: Cidade do usuário (default: "Desconhecida")
            grupo_inclusao: Grupo de inclusão (Mulheres, PCDs, LGBTQIA+, etc)
            user_name: Nome do usuário para referência
            
        Returns:
            Dict com informações do cidadão:
            {
                "cidadao_id": 123,
                "telefone_hash": "abc123...",
                "cidade": "São Paulo",
                "grupo_inclusao": null,
                "created": true/false
            }
            
        Raises:
            Exception: Se falhar ao comunicar com API ou BD
        """
        try:
            phone = self.normalize_phone_number(phone_number)
            phone_hash = self._hash_phone(phone)
            
            # Verifica cache
            if phone in self._phone_to_cidadao_cache:
                cached = self._phone_to_cidadao_cache[phone]
                logger.debug(f"📱 Cidadão encontrado em cache: {cached['cidadao_id']}")
                return {
                    "cidadao_id": cached['cidadao_id'],
                    "telefone_hash": phone_hash,
                    "cidade": cached.get('cidade', cidade),
                    "grupo_inclusao": cached.get('grupo_inclusao', grupo_inclusao),
                    "created": False
                }
            
            # Tenta encontrar cidadão existente via API
            # TODO: Implementar endpoint GET /api/v1/cidadaos/by-phone/{phone_hash}
            # Por enquanto, cria novo sempre
            
            logger.info(f"👤 Criando novo cidadão para: {phone} (hash: {phone_hash[:8]}...)")
            
            # Para esta versão, retorna dados do novo cidadão
            # Na implementação completa, faria POST /api/v1/cidadaos
            cidadao_data = {
                "cidadao_id": None,  # Será gerado pela API
                "telefone_hash": phone_hash,
                "cidade": cidade,
                "grupo_inclusao": grupo_inclusao,
                "created": True
            }
            
            # Cache para próximas requisições
            self._phone_to_cidadao_cache[phone] = {
                "cidadao_id": 0,  # Será atualizado após criar
                "cidade": cidade,
                "grupo_inclusao": grupo_inclusao
            }
            
            return cidadao_data
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter/criar cidadão: {e}")
            raise
    
    # ========== Métodos de Persistência de Dados ==========
    
    def register_interaction(
        self,
        phone_number: str,
        interaction_type: str,  # opiniao, visualizacao, reacao
        cidade: str = "Desconhecida",
        grupo_inclusao: Optional[str] = None,
        pl_id: Optional[int] = None,
        opinion: Optional[str] = None,  # a_favor, contra, pular
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Registra uma interação de um cidadão.
        
        Args:
            phone_number: Número WhatsApp do cidadão
            interaction_type: Tipo de interação (opiniao, visualizacao, reacao)
            cidade: Cidade do cidadão
            grupo_inclusao: Grupo de inclusão
            pl_id: ID do PL relacionado (opcional)
            opinion: Opinião (a_favor, contra, pular) - obrigatório se interaction_type é "opiniao"
            content: Conteúdo textual
            metadata: Metadados adicionais (dicionário)
            
        Returns:
            Resposta da API com ID da interação criada
            
        Example:
            >>> adapter.register_interaction(
            ...     phone_number="5511999999999",
            ...     interaction_type="opiniao",
            ...     cidade="São Paulo",
            ...     opinion="a_favor",
            ...     pl_id=123
            ... )
        """
        try:
            phone = self.normalize_phone_number(phone_number)
            
            logger.info(
                f"📝 Registrando interação: {interaction_type} de {phone[:8]}... "
                f"(opinião: {opinion})"
            )
            
            # Obtém/cria cidadão
            cidadao_info = self.get_or_create_cidadao(
                phone_number=phone,
                cidade=cidade,
                grupo_inclusao=grupo_inclusao
            )
            
            # TODO: Usar ID real do cidadão após implementar endpoint GET
            # Por enquanto, usa hash do telefone como cidadao_id
            cidadao_id = hash(cidadao_info['telefone_hash']) % (10 ** 8)
            
            # Prepara payload
            payload = {
                "cidadao_id": cidadao_id,
                "tipo_interacao": interaction_type,
                "pl_id": pl_id,
                "conteudo": content,
                "metadata": metadata or {
                    "cidade": cidade,
                    "grupo_inclusao": grupo_inclusao,
                    "whatsapp_origin": True
                }
            }
            
            if interaction_type == "opiniao":
                payload["opiniao"] = opinion
            
            # Faz requisição à API
            response = self._post_to_api(
                endpoint="/api/v1/interactions",
                data=payload
            )
            
            logger.info(
                f"✅ Interação registrada com sucesso: "
                f"ID {response.get('interacao_id')} "
                f"({response.get('message')})"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Erro ao registrar interação: {e}")
            raise
    
    def register_proposal(
        self,
        phone_number: str,
        content: str,
        content_type: str,  # texto, audio_transcrito
        cidade: str = "Desconhecida",
        grupo_inclusao: Optional[str] = None,
        audio_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Registra uma proposta de pauta de um cidadão.
        
        Args:
            phone_number: Número WhatsApp do cidadão
            content: Conteúdo da proposta (texto ou transcrição de áudio)
            content_type: Tipo (texto ou audio_transcrito)
            cidade: Cidade do cidadão
            grupo_inclusao: Grupo de inclusão
            audio_url: URL do arquivo de áudio (se aplicável)
            metadata: Metadados adicionais
            
        Returns:
            Resposta da API com ID da proposta e tema classificado
            
        Example:
            >>> adapter.register_proposal(
            ...     phone_number="5511999999999",
            ...     content="Precisamos de mais ciclovias na região",
            ...     content_type="texto",
            ...     cidade="São Paulo",
            ...     grupo_inclusao="Ciclistas"
            ... )
        """
        try:
            phone = self.normalize_phone_number(phone_number)
            
            logger.info(
                f"💡 Registrando proposta de {phone[:8]}... "
                f"(tema: {content[:50]}...)"
            )
            
            # Obtém/cria cidadão
            cidadao_info = self.get_or_create_cidadao(
                phone_number=phone,
                cidade=cidade,
                grupo_inclusao=grupo_inclusao
            )
            
            cidadao_id = hash(cidadao_info['telefone_hash']) % (10 ** 8)
            
            # Prepara payload
            payload = {
                "cidadao_id": cidadao_id,
                "conteudo": content,
                "tipo_conteudo": content_type,
                "audio_url": audio_url,
                "cidade": cidade,
                "grupo_inclusao": grupo_inclusao
            }
            
            # Faz requisição à API
            response = self._post_to_api(
                endpoint="/api/v1/proposals",
                data=payload
            )
            
            logger.info(
                f"✅ Proposta registrada: "
                f"ID {response.get('proposta_id')} "
                f"Tema: {response.get('tema_classificado')} "
                f"(confiança: {response.get('confidence_score'):.2f})"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Erro ao registrar proposta: {e}")
            raise
    
    # ========== Métodos de Consulta de Dados ==========
    
    def get_random_pl(self) -> Optional[Dict[str, Any]]:
        """
        Obtém um projeto de lei aleatório para enviar ao usuário.
        
        Returns:
            Dict com informações do PL ou None se não encontrado
            
        Example:
            >>> pl = adapter.get_random_pl()
            >>> print(pl['titulo'], pl['pl_id'])
        """
        try:
            logger.debug("🔍 Buscando PL aleatório...")
            
            response = self._get_from_api(endpoint="/api/v1/projetos-lei/aleatorio")
            
            if response:
                logger.info(f"✅ PL encontrado: {response.get('pl_id')} - {response.get('titulo')[:50]}...")
            else:
                logger.warning("⚠️ Nenhum PL disponível")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar PL: {e}")
            return None
    
    def get_metrics(self) -> Optional[Dict[str, Any]]:
        """
        Obtém métricas de lacuna legislativa atualizadas.
        
        Returns:
            Dict com métricas ou None se erro
        """
        try:
            logger.debug("📊 Buscando métricas...")
            
            response = self._get_from_api(endpoint="/api/v1/metrics/lacuna")
            
            logger.info("✅ Métricas obtidas com sucesso")
            return response
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter métricas: {e}")
            return None
    
    # ========== Métodos Auxiliares de Comunicação ==========
    
    def _get_from_api(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """
        Faz requisição GET à API.
        
        Args:
            endpoint: Path do endpoint (ex: /api/v1/metrics/lacuna)
            params: Query parameters opcionais
            
        Returns:
            Resposta JSON ou None se erro
        """
        try:
            url = f"{self.api_base_url}{endpoint}"
            logger.debug(f"🔗 GET {url}")
            
            response = requests.get(
                url,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erro HTTP na requisição GET {endpoint}: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Erro inesperado em GET {endpoint}: {e}")
            return None
    
    def _post_to_api(self, endpoint: str, data: Dict) -> Dict[str, Any]:
        """
        Faz requisição POST à API.
        
        Args:
            endpoint: Path do endpoint (ex: /api/v1/interactions)
            data: Dados a enviar (será convertido para JSON)
            
        Returns:
            Resposta JSON da API
            
        Raises:
            Exception: Se falhar na requisição
        """
        try:
            url = f"{self.api_base_url}{endpoint}"
            logger.debug(f"🔗 POST {url}\n📦 Payload: {json.dumps(data, indent=2)}")
            
            response = requests.post(
                url,
                json=data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"📨 Resposta: {json.dumps(result, indent=2)}")
            
            return result
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Erro HTTP {response.status_code} em POST {endpoint}: {e.response.text}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erro de conexão em POST {endpoint}: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Erro inesperado em POST {endpoint}: {e}")
            raise
    
    # ========== Métodos de Health Check ==========
    
    def is_api_healthy(self) -> bool:
        """
        Verifica se a API está acessível e saudável.
        
        Returns:
            True se API responde, False caso contrário
        """
        try:
            response = self._get_from_api(endpoint="/health")
            is_healthy = response and response.get('status') == 'healthy'
            
            if is_healthy:
                logger.info("✅ API Pipeline está saudável")
            else:
                logger.warning("⚠️ API Pipeline não respondeu com status esperado")
            
            return is_healthy
            
        except Exception as e:
            logger.error(f"❌ API Pipeline não está acessível: {e}")
            return False


# Singleton global (uso opcional)
_adapter_instance: Optional[WhatsAppPipelineAdapter] = None


def get_adapter(api_base_url: str = None) -> WhatsAppPipelineAdapter:
    """
    Obtém instância global do adapter (singleton).
    
    Args:
        api_base_url: URL da API (só usa na primeira chamada)
        
    Returns:
        Instância de WhatsAppPipelineAdapter
    """
    global _adapter_instance
    
    if _adapter_instance is None:
        _adapter_instance = WhatsAppPipelineAdapter(api_base_url)
    
    return _adapter_instance
