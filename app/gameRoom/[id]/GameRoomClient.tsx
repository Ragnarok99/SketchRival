'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext';
import { GameStateProvider } from '../../contexts/GameStateContext';
import GameContainer from '../../components/gameRoom/GameContainer';

// Interfaces
interface Room {
  id: string;
  _id?: string;  // Campo adicional que puede venir del backend (MongoDB)
  name: string;
  isPrivate?: boolean;
  type?: 'public' | 'private';
  accessCode?: string;
  hostId?: string;
  status?: string;
  players?: Array<{
    userId: string;
    username: string;
    isReady?: boolean;
    role?: string;
  }>;
  configuration?: {
    maxPlayers?: number;
    timeLimit?: number;
    categories?: string[];
    difficulty?: string;
    [key: string]: any;  // Para otras propiedades de configuración
  };
  createdAt?: string;
  // Añadir otros campos que pueda tener Room según tu aplicación
}

export default function GameRoomClient({ roomId }: { roomId: string }) {
  const { isAuthenticated, user, getAuthToken } = useAuth();
  const router = useRouter();
  
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar detalles de la sala
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('[GameRoomClient] Usuario no autenticado, redirigiendo...');
      router.push('/auth');
      return;
    }

    console.log('[GameRoomClient] Cargando detalles para roomId:', roomId);
    
    // Solicitar datos de la sala
    const fetchRoomData = async () => {
      try {
        console.log('[GameRoomClient] Intentando obtener datos de sala para roomId:', roomId);
        
        // Obtener el token de autenticación usando el método del contexto
        const token = getAuthToken();
        
        if (!token) {
          console.error('[GameRoomClient] No hay token de autenticación disponible');
          throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
        }
        
        const response = await fetch(`/api/rooms/${roomId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[GameRoomClient] Error en respuesta:', errorData);
          throw new Error(errorData.message || 'Error al cargar la sala');
        }
        
        const data = await response.json();
        console.log('[GameRoomClient] Datos de sala recibidos:', data);

        // La API devuelve { room: {...} }, extraemos la sala del objeto
        let roomData = data.room || data;
        
        console.log('[GameRoomClient] Datos normalizados de sala:', roomData);
        
        // Verificar que tengamos datos y normalizar la estructura (manejar _id o id)
        if (!roomData) {
          throw new Error('No se recibieron datos de la sala');
        }
        
        // Normalizar datos para garantizar que siempre haya una propiedad 'id'
        if (roomData._id && !roomData.id) {
          roomData = {
            ...roomData,
            id: roomData._id
          };
        }
        
        // Verificar que ahora tengamos un ID
        if (!roomData.id) {
          console.error('[GameRoomClient] Datos de sala inválidos:', roomData);
          throw new Error('Los datos de la sala no contienen un identificador válido');
        }
        
        setRoomData(roomData);
        setError(null);
      } catch (err) {
        console.error('[GameRoomClient] Error cargando sala:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        // Si hay un error de autenticación, redirigir al login
        if (err instanceof Error && err.message.includes('autenticado')) {
          router.push('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoomData();
  }, [isAuthenticated, user, roomId, router, getAuthToken]);

  // Manejar caso donde el usuario no está autenticado
  if (!isAuthenticated && !isLoading) {
    router.push('/auth');
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="text-gray-600">Redirigiendo al login...</span>
      </div>
    );
  }

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

  // Si no hay datos de sala pero no hay error ni está cargando
  if (!roomData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 max-w-md">
          <p className="text-sm text-yellow-700">
            No se pudieron cargar los datos de la sala. Inténtalo de nuevo.
          </p>
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
        roomName={roomData.name || 'Sala de juego'} 
        isPrivate={roomData.isPrivate || roomData.type === 'private' || false} 
        accessCode={roomData.accessCode} 
        onLeaveRoom={() => router.push('/gameRoom')} 
      />
    </GameStateProvider>
  );
} 