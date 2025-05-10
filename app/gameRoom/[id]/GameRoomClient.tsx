'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { GameStateProvider } from '../../contexts/GameStateContext';
import GameContainer from '../../components/gameRoom/GameContainer';
import * as api from '../../utils/api';

interface GameRoomClientProps {
  roomId: string;
}

export default function GameRoomClient({ roomId }: GameRoomClientProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [room, setRoom] = useState<{
    id: string;
    name: string;
    isPrivate: boolean;
    accessCode?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redireccionar si no está autenticado
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/auth/login?redirect=' + encodeURIComponent(`/gameRoom/${roomId}`));
    }
  }, [isAuthenticated, router, roomId, loading]);

  // Cargar detalles de la sala
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchRoom = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/rooms/${roomId}`);
        
        if (response.success) {
          setRoom({
            id: response.data.id,
            name: response.data.name,
            isPrivate: response.data.isPrivate,
            accessCode: response.data.accessCode,
          });
        } else {
          setError(response.message || 'No se pudo cargar la sala');
        }
      } catch (err: any) {
        console.error('Error al cargar la sala:', err);
        setError(err.message || 'Error al cargar la sala');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, isAuthenticated, user]);

  // Manejar salida de la sala
  const handleLeaveRoom = () => {
    router.push('/gameRoom');
  };

  // Renderizar pantalla de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Renderizar pantalla de error
  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
        <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error || 'No se pudo encontrar la sala'}</p>
          <button
            onClick={() => router.push('/gameRoom')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Volver a la lista de salas
          </button>
        </div>
      </div>
    );
  }

  // Renderizar sala de juego con el provider de estado
  return (
    <div className="container mx-auto py-6 px-4">
      <GameStateProvider roomId={room.id}>
        <GameContainer
          roomId={room.id}
          roomName={room.name}
          isPrivate={room.isPrivate}
          accessCode={room.accessCode}
          onLeaveRoom={handleLeaveRoom}
        />
      </GameStateProvider>
    </div>
  );
} 