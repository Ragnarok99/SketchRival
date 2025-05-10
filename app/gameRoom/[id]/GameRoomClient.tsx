'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { GameStateProvider } from '../../contexts/GameStateContext';
import GameContainer from '../../components/gameRoom/GameContainer';

// Interfaces
interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  accessCode?: string;
  // Añadir otros campos que pueda tener Room según tu aplicación
}

export default function GameRoomClient({ params }: { params: { id: string } }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  
  // Obtener roomId directamente de params.id
  const roomId = params.id;
  
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar detalles de la sala
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    console.log('[GameRoomClient] Cargando detalles para roomId:', roomId);
    
    // Solicitar datos de la sala
    const fetchRoomData = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar la sala');
        }
        
        const data = await response.json();
        console.log('[GameRoomClient] Datos de sala recibidos:', data);
        setRoomData(data);
      } catch (err) {
        console.error('Error cargando sala:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoomData();
  }, [isAuthenticated, user, roomId, router]);

  // Manejar caso de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3">Cargando sala de juego...</span>
      </div>
    );
  }

  // Manejar errores
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 max-w-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
        <button 
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          onClick={() => router.push('/gameRoom')}
        >
          Volver al Lobby
        </button>
      </div>
    );
  }

  // Renderizar la sala
  return (
    <GameStateProvider roomId={roomId}>
      <GameContainer 
        roomId={roomId} 
        roomName={roomData?.name || 'Sala de juego'} 
        isPrivate={roomData?.isPrivate || false} 
        accessCode={roomData?.accessCode} 
        onLeaveRoom={() => router.push('/gameRoom')} 
      />
    </GameStateProvider>
  );
} 