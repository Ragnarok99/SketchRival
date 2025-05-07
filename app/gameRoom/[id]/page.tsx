'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext'; // Suponiendo que hay un contexto de autenticación
import WaitingRoom from '../../components/gameRoom/WaitingRoom';

// Tipos
type GameRoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';
type GameRoomType = 'public' | 'private';

interface GameRoomConfig {
  maxPlayers: number;
  timeLimit?: number;
  categories?: string[];
  difficulty?: string;
}

interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: string;
}

interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  type: GameRoomType;
  status: GameRoomStatus;
  players: Player[];
  configuration: GameRoomConfig;
  accessCode?: string;
  createdAt: string;
}

export default function GameRoomDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth(); // Suponiendo que hay un contexto de autenticación
  
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);
  
  // Cargar datos de la sala
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        
        // Obtener detalles de la sala
        const response = await fetch(`/api/rooms/${params.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar los datos de la sala');
        }
        
        const data = await response.json();
        setRoom(data.room);
        
        // Si la sala ya está en juego, actualizar estado
        if (data.room.status === 'playing') {
          setGameStarted(true);
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setRoom(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomDetails();
    
    // Actualizar cada 5 segundos (se reemplazará con WebSockets)
    const intervalId = setInterval(fetchRoomDetails, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [params.id]);
  
  // Manejar inicio de juego
  const handleGameStart = () => {
    setGameStarted(true);
    // Aquí se realizaría la redirección a la página de juego o cambio de estado
    // Por ahora, solo actualizamos el estado local
  };
  
  // Abandonar sala
  const handleLeaveRoom = async () => {
    try {
      await fetch(`/api/rooms/${params.id}/leave`, {
        method: 'POST',
      });
      
      router.push('/gameRoom');
    } catch (err) {
      console.error('Error al abandonar la sala:', err);
      setError('Error al abandonar la sala');
    }
  };
  
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirigiendo al login...</div>;
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Cargando sala...</p>
      </div>
    );
  }
  
  if (error || !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">{error || 'No se pudo cargar la sala'}</p>
          <button
            onClick={() => router.push('/gameRoom')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Volver a la lista de salas
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => router.push('/gameRoom')}
          className="text-blue-600 hover:text-blue-800 mr-4"
        >
          &larr; Volver
        </button>
      </div>
      
      {room.status === 'waiting' ? (
        // Mostrar sala de espera
        <WaitingRoom
          roomId={room.id}
          roomName={room.name}
          isPrivate={room.type === 'private'}
          accessCode={room.accessCode}
          onGameStart={handleGameStart}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : room.status === 'playing' ? (
        // Mostrar pantalla de juego en progreso
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">¡Juego en progreso!</h2>
          <p className="mb-6">El juego ya ha comenzado en esta sala.</p>
          
          {/* Aquí se implementará la interfaz de juego en la tarea correspondiente */}
          <p className="text-gray-500">
            Implementación del juego en desarrollo...
          </p>
          
          <button
            onClick={handleLeaveRoom}
            className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
          >
            Abandonar juego
          </button>
        </div>
      ) : (
        // Mostrar sala cerrada o finalizada
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sala {room.status === 'finished' ? 'Finalizada' : 'Cerrada'}</h2>
          <p className="mb-6">Esta sala de juego ya no está disponible.</p>
          
          <button
            onClick={() => router.push('/gameRoom')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Volver a la lista de salas
          </button>
        </div>
      )}
    </div>
  );
} 