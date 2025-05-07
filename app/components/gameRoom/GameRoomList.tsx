'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoomCard from './RoomCard';

// Definir interfaces
interface GameRoomConfig {
  maxPlayers: number;
  timeLimit?: number;
  categories?: string[];
  difficulty?: string;
}

interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  type: 'public' | 'private';
  status: 'waiting' | 'playing' | 'finished' | 'closed';
  players: number;
  configuration: GameRoomConfig;
  accessCode?: string;
  createdAt: string;
}

interface GameRoomListProps {
  type: 'public' | 'private';
  onlyMine?: boolean;
}

export default function GameRoomList({ type, onlyMine = false }: GameRoomListProps) {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Funciones de filtrado
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        
        // Construir URL base
        let url = '/api/rooms';
        if (type === 'private' && onlyMine) {
          url = '/api/private/rooms';
        }

        // Añadir filtros como parámetros de consulta
        const params = new URLSearchParams();
        if (type === 'public') {
          params.append('type', 'public');
        }
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        // Añadir parámetros a la URL
        const finalUrl = `${url}?${params.toString()}`;
        
        // Realizar la petición
        const response = await fetch(finalUrl);
        if (!response.ok) {
          throw new Error('Error al obtener las salas');
        }

        const data = await response.json();
        setRooms(data.rooms || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
    
    // Configurar un intervalo para refrescar cada 30 segundos
    const intervalId = setInterval(fetchRooms, 30000);
    
    return () => clearInterval(intervalId);
  }, [type, onlyMine, statusFilter, searchQuery]);

  const handleJoinRoom = (roomId: string) => {
    router.push(`/gameRoom/${roomId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar salas..."
            className="w-full px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <select
          className="px-4 py-2 border rounded-lg bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todas</option>
          <option value="waiting">En espera</option>
          <option value="playing">En progreso</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-gray-600">No hay salas disponibles con los filtros seleccionados.</p>
          {type === 'public' && (
            <button 
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
              onClick={() => router.push('/gameRoom/create')}
            >
              Crear una nueva sala
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <RoomCard 
              key={room.id} 
              room={room} 
              onJoin={() => handleJoinRoom(room.id)}
              isPrivate={type === 'private'}
            />
          ))}
        </div>
      )}
    </div>
  );
} 