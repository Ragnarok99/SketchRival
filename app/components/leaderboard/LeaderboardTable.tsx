'use client';

import React from 'react';

interface LeaderboardEntryData {
  rank: number;
  username: string;
  score: number;
  level?: number;
  avatarColor?: string; // Asumiendo que se pasa para la UI
  userId?: string; // Opcional, para enlazar al perfil del usuario
}

interface LeaderboardTableProps {
  entries: LeaderboardEntryData[];
}

export default function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (!entries || entries.length === 0) {
    return <p className="text-center text-gray-600">No hay datos en el leaderboard para mostrar.</p>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
              Rango
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
              Jugador
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
              Nivel
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
              Puntuación
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr key={entry.rank} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                {entry.rank}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                <div className="flex items-center">
                  {entry.avatarColor && (
                    <span 
                      className="w-6 h-6 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: entry.avatarColor }}
                    ></span>
                  )}
                  {/* TODO: Enlazar al perfil del usuario si userId está disponible */}
                  <span>{entry.username}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                {entry.level || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-blue-600">
                {entry.score.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 