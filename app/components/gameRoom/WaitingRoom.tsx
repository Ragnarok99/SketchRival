'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import useSocket, { SocketConnectionState } from '../../hooks/useSocket';
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

// Interfaz para notificaciones
interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// Mock para simular los eventos de socket en modo desarrollo
const createMockSocket = (user: any, roomId: string, onGameStart: () => void) => {
  // Crear un objeto que simule un socket
  const mockSocket: any = {
    emit: (event: string, data: any, callback?: (error?: string, data?: any) => void) => {
      console.log(`[MOCK SOCKET] Emitido evento ${event}:`, data);
      
      // Simular comportamiento para room:join
      if (event === 'room:join') {
        setTimeout(() => {
          if (callback) {
            callback(undefined, {
              room: {
                id: roomId,
                name: `Sala ${roomId}`,
                players: [
                  {
                    userId: user.userId,
                    username: user.username,
                    isReady: false,
                    role: 'host',
                    avatarColor: '#3b82f6'
                  },
                  {
                    userId: 'mock-player1',
                    username: 'Jugador 1',
                    isReady: false,
                    role: 'player',
                    avatarColor: '#10b981'
                  }
                ]
              }
            });
          }
        }, 300);
      }
      
      // Simular comportamiento para room:setReady
      if (event === 'room:setReady') {
        const { isReady } = data;
        setTimeout(() => {
          // Emitir evento a los handlers registrados
          const playerReadyHandlers = mockSocket.handlers['room:playerReady'] || [];
          playerReadyHandlers.forEach((handler: any) => {
            handler({
              playerId: user.userId,
              isReady,
              room: {
                players: [
                  {
                    userId: user.userId,
                    username: user.username,
                    isReady,
                    role: 'host',
                    avatarColor: '#3b82f6'
                  },
                  {
                    userId: 'mock-player1',
                    username: 'Jugador 1',
                    isReady: false,
                    role: 'player',
                    avatarColor: '#10b981'
                  }
                ]
              }
            });
          });
          
          if (callback) callback();
        }, 300);
      }
      
      // Simular comportamiento para room:leave
      if (event === 'room:leave') {
        console.log('[MOCK SOCKET] Saliendo de la sala');
        // No hay que hacer nada, solo simulamos el evento
      }
    },
    on: (event: string, handler: any) => {
      if (!mockSocket.handlers[event]) {
        mockSocket.handlers[event] = [];
      }
      mockSocket.handlers[event].push(handler);
      return mockSocket;
    },
    off: (event: string) => {
      delete mockSocket.handlers[event];
      return mockSocket;
    },
    disconnect: () => {
      console.log('[MOCK SOCKET] Desconectado');
      mockSocket.handlers = {};
    },
    // Almacenar handlers para simular eventos
    handlers: {} as Record<string, any[]>
  };
  
  // Simular unión de un nuevo jugador después de 3 segundos
  setTimeout(() => {
    const joinHandlers = mockSocket.handlers['room:playerJoined'] || [];
    joinHandlers.forEach((handler: any) => {
      handler({
        room: {
          players: [
            {
              userId: user.userId,
              username: user.username,
              isReady: false,
              role: 'host',
              avatarColor: '#3b82f6'
            },
            {
              userId: 'mock-player1',
              username: 'Jugador 1',
              isReady: false,
              role: 'player',
              avatarColor: '#10b981'
            },
            {
              userId: 'mock-player2',
              username: 'Jugador 2',
              isReady: false,
              role: 'player',
              avatarColor: '#ef4444'
            }
          ]
        }
      });
    });
    
    // Simular que el jugador 1 marca como listo después de 5 segundos
    setTimeout(() => {
      const readyHandlers = mockSocket.handlers['room:playerReady'] || [];
      readyHandlers.forEach((handler: any) => {
        handler({
          playerId: 'mock-player1',
          isReady: true,
          room: {
            players: [
              {
                userId: user.userId,
                username: user.username,
                isReady: false,
                role: 'host',
                avatarColor: '#3b82f6'
              },
              {
                userId: 'mock-player1',
                username: 'Jugador 1',
                isReady: true,
                role: 'player',
                avatarColor: '#10b981'
              },
              {
                userId: 'mock-player2',
                username: 'Jugador 2',
                isReady: false,
                role: 'player',
                avatarColor: '#ef4444'
              }
            ]
          }
        });
      });
      
      // Simular que el jugador 2 marca como listo después de 8 segundos
      setTimeout(() => {
        const readyHandlers = mockSocket.handlers['room:playerReady'] || [];
        readyHandlers.forEach((handler: any) => {
          handler({
            playerId: 'mock-player2',
            isReady: true,
            room: {
              players: [
                {
                  userId: user.userId,
                  username: user.username,
                  isReady: false,
                  role: 'host',
                  avatarColor: '#3b82f6'
                },
                {
                  userId: 'mock-player1',
                  username: 'Jugador 1',
                  isReady: true,
                  role: 'player',
                  avatarColor: '#10b981'
                },
                {
                  userId: 'mock-player2',
                  username: 'Jugador 2',
                  isReady: true,
                  role: 'player',
                  avatarColor: '#ef4444'
                }
              ]
            }
          });
        });
      }, 3000);
    }, 5000);
  }, 3000);
  
  return mockSocket;
};

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
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Usar el hook useSocket para obtener métodos y estado
  const { 
    connectionState, 
    emit, 
    on, 
    joinRoom, 
    leaveRoom, 
    setReady: setSocketReady, 
    startGame: startGameSocket 
  } = useSocket();
  
  // Mover calculateReadyStats a un useMemo
  const calculateReadyStats = useMemo(() => (playersList: Player[]) => {
    const allPlayers = playersList.filter(p => p.role !== 'spectator');
    const readyPlayers = allPlayers.filter(p => p.isReady);
    const allReady = allPlayers.length > 0 && readyPlayers.length === allPlayers.length;
    
    // Mínimo 2 jugadores para comenzar
    const canStart = allPlayers.length >= 2 && allReady;
    
    setReadyStats({
      allReady,
      readyCount: readyPlayers.length,
      playerCount: allPlayers.length,
      totalPlayers: 8, // Máximo de jugadores permitidos
      canStart,
    });
  }, []);
  
  // Verificar si el usuario es anfitrión
  const isHost = useMemo(() => {
    const currentPlayer = players.find(p => p.id === user?.userId);
    return currentPlayer?.isHost || false;
  }, [players, user]);
  
  // Inicializar datos de la sala y configurar event listeners
  useEffect(() => {
    if (!user || !roomId || connectionState !== SocketConnectionState.CONNECTED) {
      if (!loading && connectionState === SocketConnectionState.ERROR) {
        setError('Error de conexión al servidor');
      }
      return;
    }
    
    // Unirse a la sala
    joinRoom(roomId, accessCode || '', (error?: string, data?: any) => {
      if (error) {
        setError(error);
        setLoading(false);
      } else if (data) {
        // Asegurarse de que players sea un array
        const playersData = Array.isArray(data.room.players) ? data.room.players : [];
        
        // Transformar el formato de jugadores para nuestro componente
        const formattedPlayers = playersData.map((player: any) => ({
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
    const unsubscribePlayerJoined = on('room:playerJoined', (data: any) => {
      // Asegurarse de que players sea un array
      const playersData = Array.isArray(data.room.players) ? data.room.players : [];
      
      const formattedPlayers = playersData.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      // Encontrar el nuevo jugador basado en el evento
      const newPlayerId = data.playerId;
      const newPlayerName = data.playerName || 'Un jugador';
      
      // Actualizar jugadores usando función para evitar closure sobre el valor actual
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
      
      // Mostrar notificación de jugador unido usando datos del evento directamente
      setNotification({
        type: 'info',
        message: `${newPlayerName} se ha unido a la sala.`
      });
      
      // Limpiar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    });
    
    const unsubscribePlayerLeft = on('room:playerLeft', (data: any) => {
      // Asegurarse de que players sea un array
      const playersData = Array.isArray(data.room.players) ? data.room.players : [];
      
      const formattedPlayers = playersData.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      // Usar el playerId proporcionado directamente en el evento
      const leftPlayerId = data.playerId;
      const leftPlayerName = data.playerName || 'Un jugador';
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
      
      // Mostrar notificación de jugador salido usando datos del evento
      setNotification({
        type: 'warning',
        message: `${leftPlayerName} ha abandonado la sala.`
      });
      
      // Limpiar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    });
    
    const unsubscribePlayerReady = on('room:playerReady', (data: any) => {
      // Asegurarse de que players sea un array
      const playersData = Array.isArray(data.room.players) ? data.room.players : [];
      
      const formattedPlayers = playersData.map((player: any) => ({
        id: player.userId,
        username: player.username,
        isReady: player.isReady,
        isHost: player.role === 'host',
        role: player.role,
        avatarColor: player.avatarColor || '#3b82f6',
      }));
      
      // Actualizar mi estado de listo
      if (data.playerId === user.userId) {
        setReadyStatus(data.isReady);
      }
      
      // Reemplazar completamente el estado de los jugadores
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
    });
    
    const unsubscribePlayerKicked = on('room:playerKicked', (data: any) => {
      // Si es uno mismo quien fue expulsado
      if (data.playerId === user.userId) {
        setNotification({
          type: 'error',
          message: 'Has sido expulsado de la sala'
        });
        
        // Navegar fuera de la sala después de mostrar la notificación
        setTimeout(() => {
          onLeaveRoom();
        }, 2000);
      } else {
        // Asegurarse de que players sea un array
        const playersData = Array.isArray(data.room.players) ? data.room.players : [];
        
        const formattedPlayers = playersData.map((player: any) => ({
          id: player.userId,
          username: player.username,
          isReady: player.isReady,
          isHost: player.role === 'host',
          role: player.role,
          avatarColor: player.avatarColor || '#3b82f6',
        }));
        
        // Mostrar notificación
        setNotification({
          type: 'warning',
          message: `${data.kickedPlayerName || 'Un jugador'} ha sido expulsado de la sala.`
        });
        
        setPlayers(formattedPlayers);
        calculateReadyStats(formattedPlayers);
        
        // Limpiar notificación después de 3 segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
    
    const unsubscribeGameStarted = on('game:started', (data: any) => {
      // Asegurarse de que estamos aún en la sala correcta
      if (data.roomId === roomId) {
        setNotification({
          type: 'success', 
          message: '¡El juego ha comenzado!' 
        });
        
        // Notificar al componente padre que el juego ha comenzado
        setTimeout(() => {
          onGameStart();
        }, 1000);
      }
    });
    
    // Limpiar al desmontar
    return () => {
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribePlayerReady();
      unsubscribePlayerKicked();
      unsubscribeGameStarted();
    };
  }, [user, roomId, accessCode, connectionState, joinRoom, on, calculateReadyStats, onLeaveRoom, onGameStart]);
  
  // Cambiar la función toggleReady para usar la función del hook
  const toggleReady = () => {
    if (!user || !roomId) return;
    
    const newStatus = !readyStatus;
    setSocketReady(roomId, newStatus, (error?: string) => {
      if (error) {
        console.error('Error al cambiar estado de listo:', error);
        setNotification({
          type: 'error',
          message: `Error: ${error}`
        });
        
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
  };
  
  // Cambiar la función startGame para usar la función del hook
  const startGame = async () => {
    if (!user || !roomId || !isHost || !readyStats.canStart) return;
    
    startGameSocket(roomId, (error?: string) => {
      if (error) {
        console.error('Error al iniciar juego:', error);
        setNotification({
          type: 'error',
          message: `Error: ${error}`
        });
        
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
  };
  
  // Cambiar la función kickPlayer para usar emit
  const kickPlayer = async (playerId: string) => {
    if (!user || !roomId || !isHost) return;
    
    emit('room:kickPlayer', { roomId, playerId }, (error?: string) => {
      if (error) {
        console.error('Error al expulsar jugador:', error);
        setNotification({
          type: 'error',
          message: `Error: ${error}`
        });
        
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
  };
  
  // Función para manejar copia de código
  const handleCopyCode = () => {
    if (!accessCode) return;
    
    navigator.clipboard.writeText(accessCode).then(
      () => {
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
      },
      (err) => {
        console.error('No se pudo copiar el texto:', err);
      }
    );
  };
  
  // Función para manejar salida de sala
  const handleLeaveRoom = () => {
    if (roomId) {
      leaveRoom(roomId);
    }
    onLeaveRoom();
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700 text-sm sm:text-base">Cargando sala de espera...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-4xl mx-auto">
      {/* Notificación */}
      {notification && (
        <div className={`mb-4 p-3 rounded text-xs sm:text-sm ${
          notification.type === 'success' ? 'bg-green-100 text-green-700' :
          notification.type === 'error' ? 'bg-red-100 text-red-700' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {notification.message}
        </div>
      )}
    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{roomName}</h2>
          <p className="text-sm sm:text-base text-gray-600">Sala de espera ({players.length}/{readyStats.totalPlayers} jugadores)</p>
        </div>
        
        {isPrivate && accessCode && (
          <div className="mt-2 sm:mt-0">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Código de acceso:</p>
            <div className="flex items-center">
              <code className="bg-gray-100 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-mono">
                {showCode ? accessCode : '••••••'}
              </code>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700 text-lg p-1"
                onClick={() => setShowCode(!showCode)}
                title={showCode ? 'Ocultar código' : 'Mostrar código'}
              >
                {showCode ? '👁️' : '🙈'}
              </button>
              <button
                className="ml-1 text-gray-500 hover:text-gray-700 text-lg p-1"
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
        <div className={`mb-4 sm:mb-6 p-3 rounded text-sm sm:text-base ${readyStats.allReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <p className="text-center">
            {readyStats.allReady
              ? `¡Todos listos! ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`
              : `Esperando... ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-2 bg-gray-50 p-3 sm:p-4 rounded-lg overflow-y-auto h-[300px] md:h-[400px] shadow-inner">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-700">Jugadores en la sala</h3>
          
          {/* Estado de la sala */}
          <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {readyStats.readyCount}/{readyStats.playerCount} listos
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {readyStats.playerCount}/{readyStats.totalPlayers} jugadores
            </span>
            {isPrivate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Sala privada
              </span>
            )}
          </div>
          
          {players.length === 0 ? (
            <div className="text-gray-500 text-sm italic p-4 text-center">
              No hay jugadores en la sala.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {players.map((player) => (
                <li key={`player-${player.id}`} className="py-2.5 sm:py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    {/* Avatar */}
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base" 
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Nombre de usuario */}
                    <div className="ml-2 sm:ml-3">
                      <p className="text-sm sm:text-base font-medium text-gray-700 flex items-center">
                        {player.username}
                        {player.isHost && (
                          <span className="ml-1.5 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                            Anfitrión
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {/* Estado de "listo" */}
                    {player.isReady ? (
                      <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Listo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                        Esperando
                      </span>
                    )}
                    
                    {/* Botón de expulsión (solo visible para el anfitrión) */}
                    {isHost && player.id !== user?.userId && (
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="text-red-500 hover:text-red-700 ml-1.5 sm:ml-2 p-1 rounded-full hover:bg-red-100 transition-colors duration-150"
                        title="Expulsar jugador"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="md:col-span-1 flex flex-col h-[300px] md:h-[400px] bg-gray-50 p-3 sm:p-4 rounded-lg shadow-inner">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-700">Chat de la Sala</h3>
          <ChatBox roomId={roomId} />
        </div>
      </div>
      
      {/* Acciones */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6 w-full md:w-auto">
        {!isHost && (
          <button
            onClick={toggleReady}
            className={`w-full md:w-auto flex-1 py-2.5 px-4 rounded-lg text-sm sm:text-base transition-colors duration-150 shadow hover:shadow-md ${
              readyStatus 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {readyStatus ? '¡Listo! ✓' : 'Marcar como listo'}
          </button>
        )}
        
        {isHost && (
          <button
            onClick={startGame}
            disabled={!readyStats.canStart}
            className={`w-full md:w-auto flex-1 py-2.5 px-4 rounded-lg text-sm sm:text-base transition-colors duration-150 shadow hover:shadow-md ${
              readyStats.canStart
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            {players.length < 2 
              ? 'Mínimo 2 jugadores'
              : !readyStats.allReady 
                ? `Esperando (${readyStats.playerCount - readyStats.readyCount} más)`
                : 'Iniciar Juego'}
          </button>
        )}
        
        <button
          onClick={handleLeaveRoom}
          className="w-full md:w-auto flex-1 py-2.5 px-4 border border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm sm:text-base transition-colors duration-150 shadow hover:shadow-md"
        >
          Abandonar Sala
        </button>
      </div>
    </div>
  );
} 