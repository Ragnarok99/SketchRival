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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Si el jugador actual es el anfitrión
  const isHost = players.find((p: Player) => p.id === user?.userId)?.isHost || false;
  
  // Inicializar conexión de socket y obtener datos iniciales
  useEffect(() => {
    if (!user) return;
    
    let socketInstance: Socket | any;
    
    // Intenta conectar a un socket real o usar el mock simulado si está en desarrollo
    try {
      // Intentar conectar con un socket real
      if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
          auth: {
            userId: user.userId,
            username: user.username
          }
        });
      } else {
        throw new Error('No socket URL available');
      }
    } catch (error) {
      console.log('[MOCK] Usando socket simulado para desarrollo');
      socketInstance = createMockSocket(user, roomId, onGameStart);
    }
    
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
    
    // Cuando un jugador se une
    socketInstance.on('room:playerJoined', (data: any) => {
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
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
      
      // Mostrar notificación de jugador unido
      const newPlayer = formattedPlayers.find((p: any) => !players.some((existingP: Player) => existingP.id === p.id));
      setNotification({
        type: 'info',
        message: `${newPlayer?.username || 'Un jugador'} se ha unido a la sala.`
      });
      
      // Limpiar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    });
    
    // Cuando un jugador abandona la sala
    socketInstance.on('room:playerLeft', (data: any) => {
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
      
      // Encontrar quién se fue
      const leftPlayer = players.find(p => !formattedPlayers.some((newP: any) => newP.id === p.id));
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
      
      // Mostrar notificación de jugador salido
      if (leftPlayer) {
        setNotification({
          type: 'warning',
          message: `${leftPlayer.username} ha abandonado la sala.`
        });
        
        // Limpiar notificación después de 3 segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
    
    // Cuando un jugador cambia su estado de listo
    socketInstance.on('room:playerReady', (data: any) => {
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
      
      setPlayers(formattedPlayers);
      
      // Si soy yo, actualizar mi estado
      if (data.playerId === user.userId) {
        setReadyStatus(data.isReady);
      }
      
      calculateReadyStats(formattedPlayers);
      
      // Mostrar notificación de estado cambiado
      const changedPlayer = formattedPlayers.find((p: any) => p.id === data.playerId);
      if (changedPlayer && data.playerId !== user.userId) {
        setNotification({
          type: data.isReady ? 'success' : 'info',
          message: `${changedPlayer.username} ${data.isReady ? 'está listo' : 'ya no está listo'}.`
        });
        
        // Limpiar notificación después de 3 segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    });
    
    // Cuando la sala se actualiza
    socketInstance.on('room:updated', (data: any) => {
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
      
      setPlayers(formattedPlayers);
      calculateReadyStats(formattedPlayers);
    });
    
    // Cuando el juego comienza
    socketInstance.on('room:gameStarted', () => {
      setNotification({
        type: 'success',
        message: '¡El juego ha comenzado!'
      });
      
      // Corto delay antes de iniciar
      setTimeout(() => {
        onGameStart();
      }, 1000);
    });
    
    // Cuando recibimos una notificación
    socketInstance.on('user:notification', (data: Notification) => {
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
  }, [roomId, user, accessCode, onGameStart, players]);
  
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al iniciar el juego');
      }
      
      // El juego comenzará cuando recibamos el evento room:gameStarted
      // Pero para desarrollo, simulamos el evento directamente
      if (process.env.NODE_ENV === 'development') {
        // Para el modo mock, simulamos la respuesta
        socket.emit('room:gameStarted');
        
        // Y llamamos directamente al onGameStart después de un delay para simular
        setTimeout(() => {
          onGameStart();
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  // Expulsar a un jugador (solo anfitrión)
  const kickPlayer = async (playerId: string) => {
    if (!isHost || !socket || !user) return;
    
    try {
      const response = await fetch(`/api/waiting-room/${roomId}/kick/${playerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al expulsar al jugador');
      }
      
      // Mostrar notificación de éxito
      setNotification({
        type: 'success',
        message: 'Jugador expulsado correctamente'
      });
      
      // Limpiar después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  // Copiar código de acceso
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
    onLeaveRoom();
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-lg shadow">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 text-sm sm:text-base">Cargando sala de espera...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-4xl mx-auto">
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
          <p className="text-sm sm:text-base text-gray-500">Sala de espera ({players.length}/{readyStats.totalPlayers} jugadores)</p>
        </div>
        
        {isPrivate && accessCode && (
          <div className="mt-2 sm:mt-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Código de acceso:</p>
            <div className="flex items-center">
              <code className="bg-gray-100 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-mono">
                {showCode ? accessCode : '******'}
              </code>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700 text-lg"
                onClick={() => setShowCode(!showCode)}
                title={showCode ? 'Ocultar código' : 'Mostrar código'}
              >
                {showCode ? '👁️' : '🙈'}
              </button>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700 text-lg"
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
        <div className={`mb-4 sm:mb-6 p-3 rounded text-sm sm:text-base ${readyStats.allReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          <p className="text-center">
            {readyStats.allReady
              ? `¡Todos listos! ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`
              : `Esperando... ${readyStats.readyCount}/${readyStats.playerCount} jugadores preparados`}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Lista de jugadores */}
        <div className="md:col-span-2 bg-gray-50 p-3 sm:p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-3">Jugadores</h3>
          
          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No hay jugadores en la sala</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {players.map((player) => (
                <li key={player.id} className="py-2.5 sm:py-3 flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <div 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      <span className="text-white text-xs sm:text-sm font-medium">
                        {player.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Nombre de usuario */}
                    <div className="min-w-0">
                      <span className="font-medium text-sm sm:text-base truncate block" title={player.username}>{player.username}</span>
                      {player.isHost && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full ml-1 sm:ml-2">
                          Anfitrión
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {/* Estado de "listo" */}
                    {player.isReady ? (
                      <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Listo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                        Esperando
                      </span>
                    )}
                    
                    {/* Botón de expulsión (solo visible para el anfitrión) */}
                    {isHost && player.id !== user?.userId && (
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="text-red-500 hover:text-red-700 ml-1.5 sm:ml-2 p-1 rounded-full hover:bg-red-100"
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
        <div className="md:col-span-1 flex flex-col h-[300px] md:h-auto bg-gray-50 p-3 sm:p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-3">Chat de la Sala</h3>
          <ChatBox roomId={roomId} />
        </div>
      </div>
      
      {/* Acciones */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6 w-full md:w-auto">
        {!isHost && (
          <button
            onClick={toggleReady}
            className={`w-full md:w-auto flex-1 py-2.5 px-4 rounded-lg text-sm sm:text-base transition-colors duration-150 ${
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
            className={`w-full md:w-auto flex-1 py-2.5 px-4 rounded-lg text-sm sm:text-base transition-colors duration-150 ${
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
          className="w-full md:w-auto flex-1 py-2.5 px-4 border border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm sm:text-base transition-colors duration-150"
        >
          Abandonar Sala
        </button>
      </div>
    </div>
  );
} 