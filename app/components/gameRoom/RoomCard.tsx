'use client';

import { useState } from 'react';

// Interfaces (deberían estar en un archivo separado en un proyecto real)
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

interface RoomCardProps {
  room: GameRoom;
  onJoin: () => void;
  isPrivate?: boolean;
}

export default function RoomCard({ room, onJoin, isPrivate = false }: RoomCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [copying, setCopying] = useState(false);

  // Formatear fecha de creación
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Determinar el estado de la sala
  const getStatusClass = () => {
    switch (room.status) {
      case 'waiting':
        return 'bg-green-100 text-green-800';
      case 'playing':
        return 'bg-blue-100 text-blue-800';
      case 'finished':
        return 'bg-gray-100 text-gray-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 'waiting':
        return 'En espera';
      case 'playing':
        return 'En progreso';
      case 'finished':
        return 'Finalizada';
      case 'closed':
        return 'Cerrada';
      default:
        return 'Desconocido';
    }
  };

  // Manejar la copia del código de acceso
  const handleCopyCode = () => {
    if (room.accessCode) {
      navigator.clipboard.writeText(room.accessCode)
        .then(() => {
          setCopying(true);
          setTimeout(() => setCopying(false), 2000);
        })
        .catch(err => console.error('Error al copiar: ', err));
    }
  };

  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg truncate" title={room.name}>
            {room.name}
          </h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass()}`}>
            {getStatusText()}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Anfitrión: {room.hostName}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Jugadores:</span>
            <span className="text-sm font-medium">
              {room.players} / {room.configuration.maxPlayers}
            </span>
          </div>
          
          {room.configuration.timeLimit && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tiempo límite:</span>
              <span className="text-sm font-medium">
                {room.configuration.timeLimit} min
              </span>
            </div>
          )}
          
          {room.configuration.difficulty && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Dificultad:</span>
              <span className="text-sm font-medium capitalize">
                {room.configuration.difficulty}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Creada:</span>
            <span className="text-sm font-medium">
              {formatDate(room.createdAt)}
            </span>
          </div>
        </div>
        
        {isPrivate && room.accessCode && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Código de acceso:</span>
              <button 
                className="text-blue-600 text-sm hover:text-blue-800" 
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showCode && (
              <div className="mt-1 flex items-center">
                <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                  {room.accessCode}
                </code>
                <button
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  onClick={handleCopyCode}
                  title="Copiar código"
                >
                  {copying ? '✓' : '📋'}
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={onJoin}
            disabled={room.status !== 'waiting'}
            className={`w-full py-2 px-4 rounded-lg ${
              room.status === 'waiting'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {room.status === 'waiting' ? 'Unirse' : 'No disponible'}
          </button>
        </div>
      </div>
    </div>
  );
} 