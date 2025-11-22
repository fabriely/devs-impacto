"""
Metrics Calculator module for Voz.Local Pipeline.

This module calculates the Legislative Gap Metric (Métrica de Lacuna Legislativa)
by comparing citizen demands vs. legislative bills in tramitação.
"""

import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.models.database import PropostaPauta, ProjetoLei, MetricaLacuna

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MetricsCalculator:
    """
    Calculates legislative gap metrics.
    
    The lacuna (gap) represents the difference between what citizens demand
    and what the legislature is working on.
    
    Formula: Lacuna = (demandas_cidadaos - pls_tramitacao) / demandas_cidadaos * 100
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize the MetricsCalculator.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session
    
    def _classify_lacuna(self, percentual: float) -> str:
        """
        Classify lacuna percentage into categories.
        
        Args:
            percentual: Lacuna percentage
            
        Returns:
            Classification: "Alta Lacuna", "Média Lacuna", or "Baixa Lacuna"
        """
        if percentual >= 70:
            return "Alta Lacuna"
        elif percentual >= 40:
            return "Média Lacuna"
        else:
            return "Baixa Lacuna"
    
    def calculate_lacuna_by_theme(self) -> List[Dict[str, Any]]:
        """
        Calculate legislative gap by theme.
        
        Returns:
            List of dictionaries with lacuna metrics by theme
        """
        try:
            # Count citizen demands by theme
            demandas = self.db.query(
                PropostaPauta.tema_principal,
                func.count(PropostaPauta.id).label('count')
            ).filter(
                PropostaPauta.tema_principal.isnot(None)
            ).group_by(
                PropostaPauta.tema_principal
            ).all()
            
            # Count PLs in tramitação by theme
            pls = self.db.query(
                ProjetoLei.tema_principal,
                func.count(ProjetoLei.id).label('count')
            ).filter(
                ProjetoLei.status == 'tramitacao',
                ProjetoLei.tema_principal.isnot(None)
            ).group_by(
                ProjetoLei.tema_principal
            ).all()
            
            # Create lookup dict for PLs
            pls_dict = {pl.tema_principal: pl.count for pl in pls}
            
            # Calculate lacuna for each theme
            results = []
            for demanda in demandas:
                tema = demanda.tema_principal
                demandas_count = demanda.count
                pls_count = pls_dict.get(tema, 0)
                
                # Calculate lacuna percentage
                if demandas_count > 0:
                    lacuna = ((demandas_count - pls_count) / demandas_count) * 100
                    lacuna = max(0, lacuna)  # Ensure non-negative
                else:
                    lacuna = 0
                
                results.append({
                    'chave': tema,
                    'demandas': demandas_count,
                    'pls': pls_count,
                    'lacuna': round(lacuna, 2),
                    'classificacao': self._classify_lacuna(lacuna)
                })
            
            # Sort by lacuna (highest first)
            results.sort(key=lambda x: x['lacuna'], reverse=True)
            
            logger.info(f"Calculated lacuna by theme: {len(results)} themes")
            return results
            
        except Exception as e:
            logger.error(f"Error calculating lacuna by theme: {e}")
            return []
    
    def calculate_lacuna_by_group(self) -> List[Dict[str, Any]]:
        """
        Calculate legislative gap by inclusion group.
        
        Returns:
            List of dictionaries with lacuna metrics by group
        """
        try:
            # Count citizen demands by group
            demandas = self.db.query(
                PropostaPauta.grupo_inclusao,
                func.count(PropostaPauta.id).label('count')
            ).filter(
                PropostaPauta.grupo_inclusao.isnot(None)
            ).group_by(
                PropostaPauta.grupo_inclusao
            ).all()
            
            # For now, we don't have PLs segmented by group
            # So we'll show 100% lacuna for all groups
            results = []
            for demanda in demandas:
                grupo = demanda.grupo_inclusao
                demandas_count = demanda.count
                pls_count = 0  # No PLs specifically for groups yet
                
                lacuna = 100.0 if demandas_count > 0 else 0
                
                results.append({
                    'chave': grupo,
                    'demandas': demandas_count,
                    'pls': pls_count,
                    'lacuna': lacuna,
                    'classificacao': self._classify_lacuna(lacuna)
                })
            
            # Sort by demandas (highest first)
            results.sort(key=lambda x: x['demandas'], reverse=True)
            
            logger.info(f"Calculated lacuna by group: {len(results)} groups")
            return results
            
        except Exception as e:
            logger.error(f"Error calculating lacuna by group: {e}")
            return []
    
    def calculate_lacuna_by_city(self) -> List[Dict[str, Any]]:
        """
        Calculate legislative gap by city.
        
        Returns:
            List of dictionaries with lacuna metrics by city
        """
        try:
            # Count citizen demands by city
            demandas = self.db.query(
                PropostaPauta.cidade,
                func.count(PropostaPauta.id).label('count')
            ).filter(
                PropostaPauta.cidade.isnot(None)
            ).group_by(
                PropostaPauta.cidade
            ).all()
            
            # Count PLs by city
            pls = self.db.query(
                ProjetoLei.cidade,
                func.count(ProjetoLei.id).label('count')
            ).filter(
                ProjetoLei.status == 'tramitacao',
                ProjetoLei.cidade.isnot(None)
            ).group_by(
                ProjetoLei.cidade
            ).all()
            
            # Create lookup dict for PLs
            pls_dict = {pl.cidade: pl.count for pl in pls}
            
            # Calculate lacuna for each city
            results = []
            for demanda in demandas:
                cidade = demanda.cidade
                demandas_count = demanda.count
                pls_count = pls_dict.get(cidade, 0)
                
                # Calculate lacuna percentage
                if demandas_count > 0:
                    lacuna = ((demandas_count - pls_count) / demandas_count) * 100
                    lacuna = max(0, lacuna)
                else:
                    lacuna = 0
                
                results.append({
                    'chave': cidade,
                    'demandas': demandas_count,
                    'pls': pls_count,
                    'lacuna': round(lacuna, 2),
                    'classificacao': self._classify_lacuna(lacuna)
                })
            
            # Sort by lacuna (highest first)
            results.sort(key=lambda x: x['lacuna'], reverse=True)
            
            logger.info(f"Calculated lacuna by city: {len(results)} cities")
            return results
            
        except Exception as e:
            logger.error(f"Error calculating lacuna by city: {e}")
            return []
    
    def save_metrics_to_cache(self) -> None:
        """
        Calculate and save all metrics to the metricas_lacuna table.
        
        This should be called periodically (e.g., every 5 minutes) to update
        the cached metrics.
        """
        try:
            # Clear existing metrics
            self.db.query(MetricaLacuna).delete()
            
            # Calculate and save theme metrics
            for metric in self.calculate_lacuna_by_theme():
                m = MetricaLacuna(
                    tipo_segmentacao='tema',
                    chave_segmentacao=metric['chave'],
                    demandas_cidadaos=metric['demandas'],
                    pls_tramitacao=metric['pls'],
                    percentual_lacuna=metric['lacuna'],
                    classificacao_lacuna=metric['classificacao']
                )
                self.db.add(m)
            
            # Calculate and save group metrics
            for metric in self.calculate_lacuna_by_group():
                m = MetricaLacuna(
                    tipo_segmentacao='grupo',
                    chave_segmentacao=metric['chave'],
                    demandas_cidadaos=metric['demandas'],
                    pls_tramitacao=metric['pls'],
                    percentual_lacuna=metric['lacuna'],
                    classificacao_lacuna=metric['classificacao']
                )
                self.db.add(m)
            
            # Calculate and save city metrics
            for metric in self.calculate_lacuna_by_city():
                m = MetricaLacuna(
                    tipo_segmentacao='cidade',
                    chave_segmentacao=metric['chave'],
                    demandas_cidadaos=metric['demandas'],
                    pls_tramitacao=metric['pls'],
                    percentual_lacuna=metric['lacuna'],
                    classificacao_lacuna=metric['classificacao']
                )
                self.db.add(m)
            
            self.db.commit()
            logger.info("Metrics saved to cache successfully")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error saving metrics to cache: {e}")
            raise
