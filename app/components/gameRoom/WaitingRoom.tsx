'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { io, Socket } from 'socket.io-client';
import ChatBox from './ChatBox';

// Tipos
interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  role: 'host' | 'player' | 'spectator';
  avatarColor: string;
}

interface WaitingRoomProps {
  roomId: string;
  roomName: string;
  isPrivate: boolean;
  accessCode?: string;
  onGameStart: () => void;
  onLeaveRoom: () => void;
}

export default function WaitingRoom({
  roomId,
  roomName,
  isPrivate,
  accessCode,
  onGameStart,
  onLeaveRoom,
}: WaitingRoomProps) {
  const { user } = useAuth();
  
  // Estados
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyStatus, setReadyStatus] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copying, setCopying] = useState(false);
  const [readyStats, setReadyStats] = useState({
    allReady: false,
    readyCount: 0,
    playerCount: 0,
    totalPlayers: 0,
    canStart: false,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notification, setNotification] = useState<{type: string, message: string} | null>(null);
  
  // Si el jugador actual es el anfitrión
  const isHost = players.find((p: Player) => p.id === user?.userId)?.isHost || false;
  
  // Inicializar conexión de socket y obtener datos iniciales
  useEffect(() => {
    if (!user) return;
    
    // Inicializar socket
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: user.userId,
        username: user.username
      }
    });
    
    setSocket(socketInstance);
    
    // Unirse a la sala
    socketInstance.emit('room:join', {
      roomId,
      userId: user.userId,
      accessCode
    }, (error?: string, data?: any) => {
      if (error) {
        setError(error);
        setLoading(false);
      } else if (data) {
        // Transformar el formato de jugadores para nuestro componente
        const formattedPlayers = data.room.players.map((player: any) => ({
          id: player.userId,
          username: player.username,
          isReady: player.isReady,
          isHost: player.role === 'host',
          role: player.role,
          avatarColor: player.avatarColor || '#3b82f6',
        }));
        
        setPlayers(formattedPlayers);
        
        // Si yo soy un jugador, obtener mi estado de listo
        const currentPlayer = formattedPlayers.find((p: Player) => p.id === user.userId);
        if (currentPlayer) {
          setReadyStatus(currentPlayer.isReady);
        }
        
        // Calcular estadísticas de listos
        calculateReadyStats(formattedPlayers);
        
        setLoading(false);
      }
    });
    
    // Configurar event listeners
    
    // Cuando un jugador se une
    socketInstance.on('room:playerJoined', (data) => {
      const formattedPlayers = data.room.players.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
    });
    
    // Cuando un jugador abandona la sala
    socketInstance.on('room:playerLeft', (data) => {
      const formattedPlayers = data.room.players.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
    });
    
    // Cuando un jugador cambia su estado de listo
    socketInstance.on('room:playerReady', (data) => {
      const formattedPlayers = data.room.players.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      setPlayers(formattedPlayers);
      
      // Si soy yo, actualizar mi estado
      if (data.playerId === user.userId) {
        setReadyStatus(data.isReady);
      }
      
      calculateReadyStats(formattedPlayers);
    });
    
    // Cuando la sala se actualiza
    socketInstance.on('room:updated', (data) => {
      const formattedPlayers = data.room.players.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
    });
    
    // Cuando el juego comienza
    socketInstance.on('room:gameStarted', () => {
      onGameStart();
    });
    
    // Cuando recibimos una notificación
    socketInstance.on('user:notification', (data) => {
      setNotification(data);
      
      // Limpiar después de 5 segundos
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    });
    
    // Limpieza al desmontar
    return () => {
      if (socketInstance) {
        socketInstance.off('room:playerJoined');
        socketInstance.off('room:playerLeft');
        socketInstance.off('room:playerReady');
        socketInstance.off('room:updated');
        socketInstance.off('room:gameStarted');
        socketInstance.off('user:notification');
        
        // Salir de la sala
        socketInstance.emit('room:leave', {
          roomId,
          userId: user.userId
        });
        
        socketInstance.disconnect();
      }
    };
  }, [roomId, user, accessCode, onGameStart]);
  
  // Calcular estadísticas de "listos"
  const calculateReadyStats = (playersList: Player[]) => {
    const playerCount = playersList.filter(p => p.role === 'player' || p.role === 'host').length;
    const readyCount = playersList.filter(p => p.isReady).length;
    const allReady = playerCount > 0 && readyCount === playerCount;
    
    setReadyStats({
      allReady,
      readyCount,
      playerCount,
      totalPlayers: 8, // Máximo de jugadores permitidos
      canStart: allReady && playerCount >= 2 && isHost,
    });
  };
  
  // Cambiar estado de "listo"
  const toggleReady = () => {
    if (!socket || !user) return;
    
    socket.emit('room:setReady', {
      roomId,
      userId: user.userId,
      isReady: !readyStatus
    }, (error?: string) => {
      if (error) {
        setError(error);
      }
    });
  };
  
  // Iniciar juego (solo anfitrión)
  const startGame = async () => {
    if (!isHost || !readyStats.canStart || !socket) return;
    
    try {
      const response = await fetch(`/api/waiting-room/${roomId}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al iniciar el juego');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  // Expulsar jugador (solo anfitrión)
  const kickPlayer = async (playerId: string) => {
    if (!isHost || playerId === user?.userId) return;
    
    try {
      const response = await fetch(`/api/waiting-room/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });
      
      if (!response.ok) {
        throw new Error('Error al expulsar al jugador');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  // Copiar código de acceso
  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode)
        .then(() => {
          setCopying(true);
          setTimeout(() => setCopying(false), 2000);
        })
        .catch(err => console.error('Error al copiar:', err));
    }
  };
  
  // Abandona la sala
  const handleLeaveRoom = () => {
    if (socket && user) {
      socket.emit('room:leave', {
        roomId,
        userId: user.userId
      });
    }
    
    onLeaveRoom();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Notificación */}
      {notification && (
        <div className={`mb-4 p-3 rounded text-sm ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' :
          notification.type === 'error' ? 'bg-red-100 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {notification.message}
        </div>
      )}
    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{roomName}</h2>
          <p className="text-gray-600">Sala de espera ({players.length}/{readyStats.totalPlayers} jugadores)</p>
        </div>
        
        {isPrivate && accessCode && (
          <div className="mt-3 sm:mt-0">
            <p className="text-sm text-gray-600 mb-1">Código de acceso:</p>
            <div className="flex items-center">
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                {showCode ? accessCode : '******'}
              </code>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCode(!showCode)}
                title={showCode ? 'Ocultar código' : 'Mostrar código'}
              >
                {showCode ? '👁️' : '👁️‍🗨️'}
              </button>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700"
                onClick={handleCopyCode}
                title="Copiar código"
              >
                {copying ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mensaje de estado */}
      {readyStats.playerCount > 0 && (
        <div className={`mb-6 p-3 rounded ${readyStats.allReady ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <p className="text-center">
            {readyStats.allReady
              ? `¡Todos listos! ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`
              : `Esperando... ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de jugadores */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Jugadores</h3>
          
          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay jugadores en la sala</p>
          ) : (
            <ul className="divide-y">
              {players.map((player) => (
                <li key={player.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{player.username}</p>
                      {player.isHost && (
                        <span className="text-xs text-gray-500">Anfitrión</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {/* Estado de "listo" */}
                    {player.isReady ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Listo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                        Esperando
                      </span>
                    )}
                    
                    {/* Botón de expulsión (solo visible para el anfitrión) */}
                    {isHost && player.id !== user?.userId && (
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Expulsar jugador"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Chat de la sala */}
        <div className="md:col-span-1">
          <ChatBox roomId={roomId} />
        </div>
      </div>
      
      {/* Acciones */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
        {!isHost && (
          <button
            onClick={toggleReady}
            className={`flex-1 py-2 px-4 rounded-lg ${
              readyStatus 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {readyStatus ? 'Listo ✓' : 'Marcar como listo'}
          </button>
        )}
        
        {isHost && (
          <button
            onClick={startGame}
            disabled={!readyStats.canStart}
            className={`flex-1 py-2 px-4 rounded-lg ${
              readyStats.canStart
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {players.length < 2 
              ? 'Se necesitan al menos 2 jugadores'
              : !readyStats.allReady 
                ? 'Esperando a que todos estén listos'
                : 'Iniciar juego'}
          </button>
        )}
        
        <button
          onClick={handleLeaveRoom}
          className="flex-1 py-2 px-4 border border-red-500 text-red-500 hover:bg-red-50 rounded-lg"
        >
          Abandonar sala
        </button>
      </div>
    </div>
  );
} 