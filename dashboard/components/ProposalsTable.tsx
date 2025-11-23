/**
 * Proposals Table Component
 */

'use client';

import { Proposta } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProposalsTableProps {
  proposals: Proposta[];
}

export default function ProposalsTable({ proposals }: ProposalsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Propostas Recentes</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proposta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tema
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {proposals.map((proposta) => (
              <tr key={proposta.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-md truncate">
                    {proposta.conteudo}
                  </div>
                  {proposta.confidenceScore && (
                    <div className="text-xs text-gray-500 mt-1">
                      Confiança: {(proposta.confidenceScore * 100).toFixed(0)}%
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {proposta.temaPrincipal || 'Não classificado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {proposta.cidade}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    proposta.tipoConteudo === 'audio_transcrito' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {proposta.tipoConteudo === 'audio_transcrito' ? '🎤 Áudio' : '✍️ Texto'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDistanceToNow(new Date(proposta.createdAt), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {proposals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma proposta encontrada
        </div>
      )}
    </div>
  );
}
