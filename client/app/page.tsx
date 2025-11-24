'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getSummaryStats, 
  getLacunaByTheme, 
  getRecentProposals,
  getProposalStats 
} from '@/lib/api';
import KPICard from '@/components/KPICard';
import LacunaChart from '@/components/LacunaChart';
import ProposalsTable from '@/components/ProposalsTable';
import { Users, FileText, AlertTriangle, TrendingUp } from 'lucide-react';

const Home = () => {
  // Fetch data
  const { data: summaryStats, isLoading: loadingSummary } = useQuery({
    queryKey: ['summaryStats'],
    queryFn: getSummaryStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: lacunaTheme, isLoading: loadingLacuna } = useQuery({
    queryKey: ['lacunaTheme'],
    queryFn: getLacunaByTheme,
    refetchInterval: 30000,
  });

  const { data: proposalsData, isLoading: loadingProposals } = useQuery({
    queryKey: ['recentProposals'],
    queryFn: () => getRecentProposals({ limit: 10 }),
    refetchInterval: 30000,
  });

  const { data: proposalStats, isLoading: loadingStats } = useQuery({
    queryKey: ['proposalStats'],
    queryFn: getProposalStats,
    refetchInterval: 30000,
  });

  const isLoading = loadingSummary || loadingLacuna || loadingProposals || loadingStats;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const topLacunas = lacunaTheme?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏛️ Voz.Local</h1>
              <p className="mt-1 text-sm text-gray-500">
                Dashboard de Engajamento Cidadão e Lacuna Legislativa
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Atualizado agora</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Sistema Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total de Cidadãos"
            value={summaryStats?.totalCidadaos || 0}
            icon={Users}
            colorClass="bg-blue-500"
          />
          <KPICard
            title="Propostas Cidadãs"
            value={summaryStats?.totalDemandas || 0}
            icon={FileText}
            colorClass="bg-green-500"
          />
          <KPICard
            title="PLs em Tramitação"
            value={summaryStats?.totalPlsTramitacao || 0}
            icon={TrendingUp}
            colorClass="bg-purple-500"
          />
          <KPICard
            title="Lacuna Geral"
            value={`${summaryStats?.percentualLacunaGeral?.toFixed(1) || 0}%`}
            icon={AlertTriangle}
            colorClass={
              (summaryStats?.percentualLacunaGeral || 0) >= 70 ? 'bg-red-500' :
              (summaryStats?.percentualLacunaGeral || 0) >= 40 ? 'bg-amber-500' :
              'bg-green-500'
            }
          />
        </div>

        {/* Top 5 Lacunas */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔴 Top 5 Lacunas Legislativas
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Temas onde há maior diferença entre demandas cidadãs e PLs em tramitação
            </p>
            
            <div className="space-y-3">
              {topLacunas.map((lacuna, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{lacuna.tema}</h3>
                      <p className="text-sm text-gray-600">
                        {lacuna.demandasCidadaos} demandas · {lacuna.plsTramitacao} PLs
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      lacuna.classificacao === 'Alta Lacuna' ? 'text-red-600' :
                      lacuna.classificacao === 'Média Lacuna' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {lacuna.percentualLacuna.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">{lacuna.classificacao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        {lacunaTheme && lacunaTheme.length > 0 && (
          <div className="mb-8">
            <LacunaChart 
              data={lacunaTheme} 
              dataKey="tema" 
              title="Lacuna Legislativa por Tema"
            />
          </div>
        )}

        {/* Proposals Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total de Propostas</h3>
            <p className="text-3xl font-bold text-gray-900">{proposalStats?.total || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Propostas por Texto</h3>
            <p className="text-3xl font-bold text-blue-600">
              {proposalStats?.typeBreakdown?.texto || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Propostas por Áudio</h3>
            <p className="text-3xl font-bold text-purple-600">
              {proposalStats?.typeBreakdown?.audio_transcrito || 0}
            </p>
          </div>
        </div>

        {/* Recent Proposals Table */}
        {proposalsData && proposalsData.data.length > 0 && (
          <ProposalsTable proposals={proposalsData.data} />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Voz.Local - Conectando cidadãos ao legislativo</p>
          <p className="mt-1">Dados atualizados automaticamente a cada 30 segundos</p>
        </footer>
      </main>
    </div>
  );
}

export default Home;