"""
Real-time Sync Service

Serviço para sincronização em tempo real entre a Pipeline e o Dashboard.
Monitora mudanças no banco de dados e notifica o dashboard quando há novos dados.

Este módulo fornece:
- Cache inteligente com TTL para reduzir carga no BD
- Detecção de mudanças desde a última consulta
- Endpoints para o dashboard buscar dados atualizados
- Sistema de notificações (opcional, para uso futuro)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.models.database import (
    Cidadao, ProjetoLei, Interacao, PropostaPauta, MetricaLacuna
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RealtimeSyncService:
    """
    Serviço responsável pela sincronização em tempo real entre Pipeline e Dashboard.
    
    Implementa estratégia de cache com TTL (Time To Live) para:
    1. Reduzir carga no banco de dados
    2. Melhorar performance do dashboard (Streamlit cache é feito no cliente)
    3. Detectar e relatar mudanças
    """
    
    def __init__(self, db_session: Session, cache_ttl: int = 5):
        """
        Inicializa o serviço de sincronização.
        
        Args:
            db_session: Sessão SQLAlchemy do banco de dados
            cache_ttl: Time-to-live do cache em segundos (default: 5)
        """
        self.db = db_session
        self.cache_ttl = cache_ttl
        
        # Cache local de métricas e dados
        self._cache: Dict[str, Dict[str, Any]] = {
            'resumo': {'data': None, 'valor': None},
            'lacunas': {'data': None, 'valor': None},
            'propostas': {'data': None, 'valor': None},
        }
        
        logger.info(f"✅ RealtimeSyncService inicializado com TTL de {cache_ttl}s")
    
    # ========== Métodos de Cache ==========
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """
        Verifica se o cache é válido (não expirou).
        
        Args:
            cache_key: Chave do cache (ex: 'resumo', 'lacunas')
            
        Returns:
            True se cache é válido, False se expirou
        """
        if cache_key not in self._cache:
            return False
        
        cache_entry = self._cache[cache_key]
        
        if cache_entry['data'] is None:
            return False
        
        age = (datetime.now() - cache_entry['data']).total_seconds()
        is_valid = age < self.cache_ttl
        
        if not is_valid:
            logger.debug(f"⏱️ Cache '{cache_key}' expirado (idade: {age:.1f}s)")
        
        return is_valid
    
    def _set_cache(self, cache_key: str, valor: Any) -> None:
        """
        Define um valor no cache.
        
        Args:
            cache_key: Chave do cache
            valor: Valor a cachear
        """
        self._cache[cache_key] = {
            'data': datetime.now(),
            'valor': valor
        }
        logger.debug(f"💾 Cache '{cache_key}' atualizado")
    
    def _get_cache(self, cache_key: str) -> Optional[Any]:
        """
        Obtém um valor do cache se válido.
        
        Args:
            cache_key: Chave do cache
            
        Returns:
            Valor cacheado ou None se expirado
        """
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]['valor']
        
        return None
    
    def clear_cache(self, cache_key: str = None) -> None:
        """
        Limpa o cache (total ou parcial).
        
        Args:
            cache_key: Chave específica a limpar (None para limpar tudo)
        """
        if cache_key is None:
            self._cache = {k: {'data': None, 'valor': None} for k in self._cache.keys()}
            logger.info("🗑️ Cache completo limpo")
        else:
            if cache_key in self._cache:
                self._cache[cache_key] = {'data': None, 'valor': None}
                logger.info(f"🗑️ Cache '{cache_key}' limpo")
    
    # ========== Métodos de Consulta de Dados ==========
    
    def get_resumo_dashboard(self) -> Dict[str, Any]:
        """
        Obtém resumo dos dados para o dashboard (KPIs principais).
        
        Returns:
            Dict com:
            - total_cidadaos: Número de cidadãos ativos
            - total_interacoes: Número de interações registradas
            - total_propostas: Número de propostas registradas
            - media_engajamento: Taxa média de engajamento
            - ultima_atualizacao: Timestamp da última atualização
        """
        try:
            # Verifica cache
            cached = self._get_cache('resumo')
            if cached:
                logger.debug("📦 Resumo retornado do cache")
                return cached
            
            logger.info("📊 Calculando resumo do dashboard...")
            
            # Consultas ao BD
            total_cidadaos = self.db.query(Cidadao).count()
            total_interacoes = self.db.query(Interacao).count()
            total_propostas = self.db.query(PropostaPauta).count()
            
            # Calcula taxa de engajamento (propostas + interações / cidadãos)
            total_engajamentos = total_propostas + total_interacoes
            media_engajamento = (
                (total_engajamentos / total_cidadaos * 100)
                if total_cidadaos > 0 else 0.0
            )
            
            # Contagem de interações nos últimos 7 dias
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            interacoes_semana = self.db.query(Interacao).filter(
                Interacao.timestamp >= seven_days_ago
            ).count()
            
            resultado = {
                'total_cidadaos': total_cidadaos,
                'total_interacoes': total_interacoes,
                'total_propostas': total_propostas,
                'media_engajamento': media_engajamento,
                'interacoes_semana': interacoes_semana,
                'ultima_atualizacao': datetime.utcnow().isoformat()
            }
            
            # Cacheia resultado
            self._set_cache('resumo', resultado)
            
            logger.info(f"✅ Resumo calculado: {total_cidadaos} cidadãos, "
                       f"{total_interacoes} interações, {total_propostas} propostas")
            
            return resultado
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter resumo: {e}")
            raise
    
    def get_tendencia_interacoes(self, dias: int = 7) -> List[Dict[str, Any]]:
        """
        Obtém tendência de interações dos últimos N dias.
        
        Args:
            dias: Número de dias a recuperar (default: 7)
            
        Returns:
            Lista com dados de data e quantidade de interações
        """
        try:
            logger.debug(f"📈 Buscando tendência de {dias} dias...")
            
            # Data de corte
            data_corte = datetime.utcnow() - timedelta(days=dias)
            
            # Query por dia
            resultado = self.db.query(
                func.date(Interacao.timestamp).label('data'),
                func.count(Interacao.id).label('quantidade')
            ).filter(
                Interacao.timestamp >= data_corte
            ).group_by(
                func.date(Interacao.timestamp)
            ).order_by(
                'data'
            ).all()
            
            # Formata resultado
            dados = [
                {
                    'data': str(row.data),
                    'quantidade': row.quantidade
                }
                for row in resultado
            ]
            
            logger.info(f"✅ Tendência obtida: {len(dados)} dias com dados")
            
            return dados
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter tendência: {e}")
            raise
    
    def get_propostas_populares(self, limite: int = 10) -> List[Dict[str, Any]]:
        """
        Obtém as propostas mais populares (mais interações).
        
        Args:
            limite: Número de propostas a retornar
            
        Returns:
            Lista com propostas ordenadas por interações
        """
        try:
            logger.debug(f"💡 Buscando {limite} propostas mais populares...")
            
            # TODO: Implementar contagem de interações por proposta
            # Por enquanto, retorna todas ordenadas por ID
            propostas = self.db.query(PropostaPauta).order_by(
                PropostaPauta.id.desc()
            ).limit(limite).all()
            
            dados = [
                {
                    'proposta_id': p.id,
                    'cidadao_id': p.cidadao_id,
                    'conteudo': p.conteudo[:100],  # Primeiros 100 caracteres
                    'tema_principal': p.tema_principal,
                    'confidence_score': p.confidence_score,
                    'grupo_inclusao': p.grupo_inclusao,
                    'cidade': p.cidade,
                    'timestamp': p.timestamp.isoformat()
                }
                for p in propostas
            ]
            
            logger.info(f"✅ {len(dados)} propostas populares obtidas")
            
            return dados
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter propostas populares: {e}")
            raise
    
    # ========== Métodos de Detecção de Mudanças ==========
    
    def has_new_data(self) -> Dict[str, bool]:
        """
        Detecta se há novos dados desde a última sincronização.
        
        Útil para Dashboard determinar se precisa fazer refresh.
        
        Returns:
            Dict indicando se há novos dados em cada categoria
            {
                'interacoes': True/False,
                'propostas': True/False,
                'cidadaos': True/False
            }
        """
        try:
            # Para versão atual, sempre retorna True (indicando sempre chacar)
            # Em versão futura, pode usar triggers do BD ou timestamps
            return {
                'interacoes': True,
                'propostas': True,
                'cidadaos': True
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar novos dados: {e}")
            return {}
    
    # ========== Métodos Auxiliares ==========
    
    def get_cache_status(self) -> Dict[str, Any]:
        """
        Retorna status atual do cache (para debugging).
        
        Returns:
            Dict com informações de cada entrada do cache
        """
        status = {}
        
        for cache_key, cache_entry in self._cache.items():
            is_valid = self._is_cache_valid(cache_key)
            
            age = None
            if cache_entry['data']:
                age = (datetime.now() - cache_entry['data']).total_seconds()
            
            status[cache_key] = {
                'valido': is_valid,
                'idade_segundos': age,
                'tem_valor': cache_entry['valor'] is not None
            }
        
        return status


# Singleton global (uso opcional)
_sync_service_instance: Optional[RealtimeSyncService] = None


def get_sync_service(db_session: Session = None, cache_ttl: int = 5) -> RealtimeSyncService:
    """
    Obtém instância global do serviço de sincronização (singleton).
    
    Args:
        db_session: Sessão do BD (só usa na primeira chamada)
        cache_ttl: TTL do cache em segundos
        
    Returns:
        Instância de RealtimeSyncService
    """
    global _sync_service_instance
    
    if _sync_service_instance is None:
        if db_session is None:
            raise ValueError("db_session é obrigatório na primeira chamada")
        
        _sync_service_instance = RealtimeSyncService(db_session, cache_ttl)
    
    return _sync_service_instance
