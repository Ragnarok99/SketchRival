'use client';

import React, { useState, useEffect } from 'react';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import {
  getLeaderboard,
  getActiveSeasons,
  getSeasonLeaderboard,
  ApiLeaderboardEntry,
  ApiSeason,
  ApiSeasonReward,
} from '../services/apiService';
import { useAuth } from '../auth/AuthContext';

// Adaptar la interfaz para la UI si es necesario, o usar ApiLeaderboardEntry directamente
interface ULeaderboardEntry {
  rank: number; // Aseguramos que rank es obligatorio y de tipo número
  userId: string;
  username: string;
  score: number;
  level?: number;
  avatarColor?: string; // Propiedad añadida en el frontend
}

// Función para asignar colores de avatar simples basados en el username
function assignAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - color.length) + color;
}

export default function LeaderboardsPage() {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<ULeaderboardEntry[]>([]);
  const [activeSeason, setActiveSeason] = useState<ApiSeason | null>(null);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<ULeaderboardEntry[]>([]);
  
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isLoadingSeason, setIsLoadingSeason] = useState(true);
  
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [errorSeason, setErrorSeason] = useState<string | null>(null);
  
  const [globalPage, setGlobalPage] = useState(1);
  const [globalTotalPages, setGlobalTotalPages] = useState(1);
  const [seasonPage, setSeasonPage] = useState(1);
  const [seasonTotalPages, setSeasonTotalPages] = useState(1);

  // const { authToken } = useAuth(); // Si se necesita para my-rank

  useEffect(() => {
    const fetchGlobalLeaderboard = async () => {
      setIsLoadingGlobal(true);
      setErrorGlobal(null);
      try {
        const data = await getLeaderboard('global', globalPage, 10); // 10 por página para global
        const uiEntries = data.entries.map((entry: ApiLeaderboardEntry) => ({
          ...entry,
          rank: entry.rank || 0, // Asignar 0 si no hay rank
          avatarColor: assignAvatarColor(entry.username),
        }));
        setGlobalLeaderboard(uiEntries);
        setGlobalTotalPages(data.totalPages);
      } catch (err) {
        setErrorGlobal(err instanceof Error ? err.message : 'Error al cargar leaderboard global.');
        setGlobalLeaderboard([]);
      }
      setIsLoadingGlobal(false);
    };
    fetchGlobalLeaderboard();
  }, [globalPage]);

  useEffect(() => {
    const fetchSeasonData = async () => {
      setIsLoadingSeason(true);
      setErrorSeason(null);
      try {
        const seasons = await getActiveSeasons();
        if (seasons && seasons.length > 0) {
          const currentSeason = seasons[0]; // Asumir la primera activa
          setActiveSeason(currentSeason);
          
          const data = await getSeasonLeaderboard(currentSeason.leaderboardCategoryKey, seasonPage, 10);
          const uiEntries = data.entries.map((entry: ApiLeaderboardEntry) => ({
            ...entry,
            rank: entry.rank || 0, // Asignar 0 si no hay rank
            avatarColor: assignAvatarColor(entry.username),
          }));
          setSeasonLeaderboard(uiEntries);
          setSeasonTotalPages(data.totalPages);
        } else {
          setActiveSeason(null);
          setSeasonLeaderboard([]);
        }
      } catch (err) {
        setErrorSeason(err instanceof Error ? err.message : 'Error al cargar datos de temporada.');
        setActiveSeason(null);
        setSeasonLeaderboard([]);
      }
      setIsLoadingSeason(false);
    };
    fetchSeasonData();
  }, [seasonPage]);

  // Funciones de paginación para global
  const handleGlobalNextPage = () => { if (globalPage < globalTotalPages) setGlobalPage(p => p + 1); };
  const handleGlobalPrevPage = () => { if (globalPage > 1) setGlobalPage(p => p - 1); };

  // Funciones de paginación para temporada
  const handleSeasonNextPage = () => { if (seasonPage < seasonTotalPages) setSeasonPage(p => p + 1); };
  const handleSeasonPrevPage = () => { if (seasonPage > 1) setSeasonPage(p => p - 1); };

  // TODO: Implementar selección de categoría (dropdown, botones, etc.)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-12 text-gray-800">Tablas de Clasificación</h1>

      {/* Sección de Temporada Activa */}
      {isLoadingSeason && <p className="text-center text-gray-600 py-5">Cargando información de temporada...</p>}
      {errorSeason && <p className="text-center text-red-500 py-5">Error de temporada: {errorSeason}</p>}
      {!isLoadingSeason && activeSeason && (
        <div className="mb-12 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-xl text-white">
          <h2 className="text-2xl font-bold mb-2">Temporada Activa: {activeSeason.name}</h2>
          {activeSeason.description && <p className="mb-1 text-blue-100">{activeSeason.description}</p>}
          <p className="text-sm mb-4 text-blue-200">
            Termina en: {new Date(activeSeason.endDate).toLocaleDateString()} (Quedan {Math.ceil((new Date(activeSeason.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días)
          </p>
          {activeSeason.rewards && activeSeason.rewards.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-1">Recompensas de Temporada:</h3>
              <ul className="list-disc list-inside text-sm text-blue-100">
                {activeSeason.rewards.map((reward: ApiSeasonReward, i: number) => (
                  <li key={i}>Top {reward.rankMin}-{reward.rankMax}: {reward.description}</li>
                ))}
              </ul>
            </div>
          )}
          <h3 className="text-xl font-semibold mt-4 mb-2">Clasificación de la Temporada</h3>
          {seasonLeaderboard.length === 0 && !errorSeason && <p className="text-blue-100">Aún no hay datos para esta temporada.</p>}
          {seasonLeaderboard.length > 0 && <LeaderboardTable entries={seasonLeaderboard} />}
          {seasonTotalPages > 1 && (
            <div className="mt-4 flex justify-center items-center space-x-3">
              <button onClick={handleSeasonPrevPage} disabled={seasonPage <= 1} className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-50">Anterior</button>
              <span>Página {seasonPage} de {seasonTotalPages}</span>
              <button onClick={handleSeasonNextPage} disabled={seasonPage >= seasonTotalPages} className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 disabled:opacity-50">Siguiente</button>
            </div>
          )}
        </div>
      )}
      {!isLoadingSeason && !activeSeason && !errorSeason && (
        <p className="text-center text-gray-600 mb-10 bg-gray-100 p-4 rounded-md">No hay ninguna temporada activa en este momento.</p>
      )}

      {/* Sección de Leaderboard Global */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-700">Clasificación Global</h2>
        {isLoadingGlobal && <p className="text-center text-gray-600 py-5">Cargando clasificación global...</p>}
        {errorGlobal && <p className="text-center text-red-500 py-5">Error global: {errorGlobal}</p>}
        {!isLoadingGlobal && !errorGlobal && globalLeaderboard.length === 0 && (
           <p className="text-center text-gray-600 py-5">No hay datos disponibles para la clasificación global.</p>
        )}
        {!isLoadingGlobal && !errorGlobal && globalLeaderboard.length > 0 && (
          <LeaderboardTable entries={globalLeaderboard} />
        )}
        {!isLoadingGlobal && globalTotalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-4">
              <button onClick={handleGlobalPrevPage} disabled={globalPage <= 1} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50">Anterior</button>
              <span>Página {globalPage} de {globalTotalPages}</span>
              <button onClick={handleGlobalNextPage} disabled={globalPage >= globalTotalPages} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50">Siguiente</button>
            </div>
        )}
      </div>

    </div>
  );
}
