/**
 * API Client for Voz.Local Backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface LacunaMetric {
  tema?: string;
  grupo?: string;
  cidade?: string;
  demandasCidadaos: number;
  plsTramitacao: number;
  percentualLacuna: number;
  classificacao: 'Alta Lacuna' | 'Média Lacuna' | 'Baixa Lacuna';
}

export interface Proposta {
  id: number;
  conteudo: string;
  temaPrincipal: string | null;
  temasSecundarios: string[];
  confidenceScore: number | null;
  cidade: string;
  grupoInclusao: string | null;
  tipoConteudo: string;
  timestamp: string;
  createdAt: string;
}

export interface SummaryStats {
  totalDemandas: number;
  totalPlsTramitacao: number;
  percentualLacunaGeral: number;
  totalCidadaos: number;
  totalCidades: number;
}

export interface ProposalStats {
  total: number;
  typeBreakdown: Record<string, number>;
  averageConfidence: number;
}

export interface ThemeCount {
  tema: string;
  count: number;
}

export interface CityCount {
  cidade: string;
  count: number;
}

// API Functions

/**
 * Get lacuna metrics by theme
 */
export async function getLacunaByTheme(): Promise<LacunaMetric[]> {
  const response = await apiClient.get<{ success: boolean; data: LacunaMetric[] }>(
    '/api/metrics/lacuna/theme'
  );
  return response.data.data;
}

/**
 * Get lacuna metrics by city
 */
export async function getLacunaByCity(): Promise<LacunaMetric[]> {
  const response = await apiClient.get<{ success: boolean; data: LacunaMetric[] }>(
    '/api/metrics/lacuna/city'
  );
  return response.data.data;
}

/**
 * Get lacuna metrics by group
 */
export async function getLacunaByGroup(): Promise<LacunaMetric[]> {
  const response = await apiClient.get<{ success: boolean; data: LacunaMetric[] }>(
    '/api/metrics/lacuna/group'
  );
  return response.data.data;
}

/**
 * Get summary statistics
 */
export async function getSummaryStats(): Promise<SummaryStats> {
  const response = await apiClient.get<{ success: boolean; data: SummaryStats }>(
    '/api/metrics/summary'
  );
  return response.data.data;
}

/**
 * Get recent proposals
 */
export async function getRecentProposals(params?: {
  limit?: number;
  offset?: number;
  tema?: string;
  cidade?: string;
}): Promise<{ data: Proposta[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }> {
  const response = await apiClient.get('/api/proposals/recent', { params });
  return response.data;
}

/**
 * Get proposals by theme
 */
export async function getProposalsByTheme(): Promise<ThemeCount[]> {
  const response = await apiClient.get<{ success: boolean; data: ThemeCount[] }>(
    '/api/proposals/by-theme'
  );
  return response.data.data;
}

/**
 * Get proposals by city
 */
export async function getProposalsByCity(): Promise<CityCount[]> {
  const response = await apiClient.get<{ success: boolean; data: CityCount[] }>(
    '/api/proposals/by-city'
  );
  return response.data.data;
}

/**
 * Get proposal statistics
 */
export async function getProposalStats(): Promise<ProposalStats> {
  const response = await apiClient.get<{ success: boolean; data: ProposalStats }>(
    '/api/proposals/stats/summary'
  );
  return response.data.data;
}

/**
 * Get health status
 */
export async function getHealthStatus() {
  const response = await apiClient.get('/api/health/detailed');
  return response.data;
}

export default apiClient;
