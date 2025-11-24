/**
 * Lacuna Chart Component - Bar Chart
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LacunaMetric } from '@/lib/api';

interface LacunaChartProps {
  data: LacunaMetric[];
  dataKey: 'tema' | 'cidade' | 'grupo';
  title: string;
}

const COLORS = {
  'Alta Lacuna': '#ef4444',    // red-500
  'Média Lacuna': '#f59e0b',   // amber-500
  'Baixa Lacuna': '#10b981',   // green-500
};

export default function LacunaChart({ data, dataKey, title }: LacunaChartProps) {
  const chartData = data.map((item) => ({
    name: item[dataKey] || 'Não especificado',
    'Demandas Cidadãos': item.demandasCidadaos,
    'PLs Tramitação': item.plsTramitacao,
    'Lacuna %': item.percentualLacuna,
    classificacao: item.classificacao,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={120}
            fontSize={12}
          />
          <YAxis />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="font-semibold text-gray-900">{data.name}</p>
                    <p className="text-sm text-blue-600">
                      Demandas: {data['Demandas Cidadãos']}
                    </p>
                    <p className="text-sm text-green-600">
                      PLs: {data['PLs Tramitação']}
                    </p>
                    <p className={`text-sm font-bold ${
                      data.classificacao === 'Alta Lacuna' ? 'text-red-600' :
                      data.classificacao === 'Média Lacuna' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      Lacuna: {data['Lacuna %'].toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.classificacao}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar dataKey="Demandas Cidadãos" fill="#3b82f6" />
          <Bar dataKey="PLs Tramitação" fill="#10b981" />
          <Bar dataKey="Lacuna %" fill="#ef4444">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.classificacao]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend for classifications */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-600">Alta Lacuna (≥70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="text-sm text-gray-600">Média Lacuna (40-69%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">Baixa Lacuna (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
