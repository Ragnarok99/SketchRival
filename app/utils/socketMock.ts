'use client';

import { Socket } from 'socket.io-client';
import { MessageEvent, NotificationEvent, RoomEvent, PlayerReadyEvent, PlayerJoinedEvent, PlayerLeftEvent, GameStartedEvent } from '../hooks/useSocket';

// Interfaz para representar un socket simulado
export interface MockSocket {
  id: string;
  emit: (event: string, data: any, callback?: Function) => void;
  on: (event: string, handler: Function) => MockSocket;
  off: (event: string) => MockSocket;
  disconnect: () => void;
  connected: boolean;
  disconnected: boolean;
  handlers: Record<string, Function[]>;
}

// Función para crear un ID único
const generateId = () => Math.random().toString(36).substring(2, 15);

// Colores aleatorios para avatares
const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

// Función para obtener un color aleatorio
const getRandomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

// Interfaz para los parámetros de un socket mock
interface MockSocketOptions {
  userId: string;
  username: string;
  roomId?: string;
  onGameStart?: () => void;
  simulateDelay?: boolean;
  simulatePlayers?: boolean;
}

/**
 * Crea un socket simulado para desarrollo sin servidor.
 * Emula el comportamiento básico de socket.io para salas, chat y notificaciones.
 */
export function createMockSocket({
  userId,
  username,
  roomId = '',
  onGameStart,
  simulateDelay = true,
  simulatePlayers = true,
}: MockSocketOptions): MockSocket {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const getRandomDelay = () => simulateDelay ? Math.floor(Math.random() * 300) + 100 : 0;

  // Estado interno del mock
  const internalState = {
    room: {
      id: roomId,
      name: `Sala ${roomId}`,
      players: [
        {
          userId,
          username,
          isReady: false,
          role: 'host',
          avatarColor: '#3b82f6',
        },
      ],
      messages: [],
    },
    connected: true,
  };

  // Crear socket simulado
  const mockSocket: MockSocket = {
    id: generateId(),
    connected: true,
    disconnected: false,
    handlers: {},
    
    // Emitir evento
    emit: async (event: string, data: any, callback?: Function) => {
      console.log(`[MOCK SOCKET] Emitido evento ${event}:`, data);
      
      // Simular latencia de red
      if (simulateDelay) {
        await delay(getRandomDelay());
      }
      
      // Manejar diferentes tipos de eventos
      switch(event) {
        case 'room:join':
          handleRoomJoin(data, callback);
          break;
        
        case 'room:leave':
          handleRoomLeave(data, callback);
          break;
        
        case 'room:setReady':
          handleSetReady(data, callback);
          break;
        
        case 'chat:send':
          handleChatSend(data, callback);
          break;
        
        case 'game:start':
          handleGameStart(data, callback);
          break;
          
        default:
          console.log(`[MOCK SOCKET] Evento no manejado: ${event}`);
          if (callback) callback();
      }
    },
    
    // Registrar manejador de eventos
    on: (event: string, handler: Function) => {
      if (!mockSocket.handlers[event]) {
        mockSocket.handlers[event] = [];
      }
      mockSocket.handlers[event].push(handler);
      return mockSocket;
    },
    
    // Eliminar manejador de eventos
    off: (event: string) => {
      delete mockSocket.handlers[event];
      return mockSocket;
    },
    
    // Desconectar socket
    disconnect: () => {
      console.log('[MOCK SOCKET] Desconectado');
      mockSocket.connected = false;
      mockSocket.disconnected = true;
      mockSocket.handlers = {};
      internalState.connected = false;
    }
  };

  // Manejadores internos para diferentes eventos
  const handleRoomJoin = async (data: any, callback?: Function) => {
    const { roomId, accessCode = '' } = data;
    
    // Simular validación de código de acceso para salas privadas
    if (roomId.includes('private') && accessCode !== 'ABC123') {
      if (callback) callback('Código de acceso inválido');
      return;
    }
    
    // Actualizar estado interno
    internalState.room.id = roomId;
    internalState.room.name = `Sala ${roomId}`;
    
    // Si se especificó un callback, devolver datos de sala
    if (callback) {
      callback(undefined, {
        room: {
          id: roomId,
          name: internalState.room.name,
          players: internalState.room.players,
        }
      });
    }
    
    // Simular jugadores adicionales que se unen
    if (simulatePlayers) {
      simulatePlayerJoins();
    }
  };
  
  const handleRoomLeave = async (data: any, callback?: Function) => {
    // Simular salida de sala
    if (callback) callback();
  };
  
  const handleSetReady = async (data: any, callback?: Function) => {
    const { isReady } = data;
    
    // Actualizar estado del jugador
    const playerIndex = internalState.room.players.findIndex(p => p.userId === userId);
    if (playerIndex !== -1) {
      internalState.room.players[playerIndex].isReady = isReady;
    }
    
    // Emitir evento a los handlers registrados
    emitToHandlers('room:playerReady', {
      playerId: userId,
      isReady,
      room: {
        players: internalState.room.players
      }
    } as PlayerReadyEvent);
    
    if (callback) callback();
    
    // Comprobar si todos están listos
    checkAllReady();
  };
  
  const handleChatSend = async (data: any, callback?: Function) => {
    const { text } = data;
    
    // Crear mensaje
    const message: MessageEvent = {
      senderId: userId,
      senderName: username,
      text,
      timestamp: Date.now()
    };
    
    // Añadir mensaje al historial
    internalState.room.messages.push(message);
    
    // Emitir evento a los handlers registrados
    emitToHandlers('chat:message', message);
    
    if (callback) callback();
  };
  
  const handleGameStart = async (data: any, callback?: Function) => {
    // Emitir evento de juego iniciado
    emitToHandlers('room:gameStarted', {
      roomId: internalState.room.id,
      startedById: userId
    } as GameStartedEvent);
    
    // Llamar al callback de inicio de juego si existe
    if (onGameStart) {
      setTimeout(() => {
        onGameStart();
      }, 1000);
    }
    
    if (callback) callback();
  };
  
  // Función auxiliar para emitir eventos a los handlers registrados
  const emitToHandlers = <T>(event: string, data: T) => {
    const handlers = mockSocket.handlers[event] || [];
    handlers.forEach(handler => {
      handler(data);
    });
  };
  
  // Simular que se unen otros jugadores
  const simulatePlayerJoins = async () => {
    if (!simulatePlayers) return;
    
    // Primer jugador se une después de un tiempo aleatorio
    setTimeout(() => {
      const newPlayer = {
        userId: 'mock-player1',
        username: 'Jugador 1',
        isReady: false,
        role: 'player',
        avatarColor: getRandomColor()
      };
      
      internalState.room.players.push(newPlayer);
      
      emitToHandlers('room:playerJoined', {
        playerId: newPlayer.userId,
        playerName: newPlayer.username,
        room: {
          players: internalState.room.players
        }
      } as PlayerJoinedEvent);
      
      // Enviar mensaje de bienvenida
      emitSystemMessage('¡Bienvenido a la sala de chat!');
      
      // Simular mensaje del jugador
      setTimeout(() => {
        emitToHandlers('chat:message', {
          senderId: newPlayer.userId,
          senderName: newPlayer.username,
          text: '¡Hola a todos! ¿Listos para jugar?',
          timestamp: Date.now()
        } as MessageEvent);
      }, 2000);
      
      // Segundo jugador se une después
      setTimeout(() => {
        const newPlayer2 = {
          userId: 'mock-player2',
          username: 'Jugador 2',
          isReady: false,
          role: 'player',
          avatarColor: getRandomColor()
        };
        
        internalState.room.players.push(newPlayer2);
        
        emitToHandlers('room:playerJoined', {
          playerId: newPlayer2.userId,
          playerName: newPlayer2.username,
          room: {
            players: internalState.room.players
          }
        } as PlayerJoinedEvent);
        
        // Simular que los jugadores se marcan como listos
        simulatePlayersReady();
      }, 5000);
    }, 3000);
  };
  
  // Simular que los jugadores se marcan como listos
  const simulatePlayersReady = async () => {
    // Jugador 1 se marca como listo
    setTimeout(() => {
      const playerIndex = internalState.room.players.findIndex(p => p.userId === 'mock-player1');
      if (playerIndex !== -1) {
        internalState.room.players[playerIndex].isReady = true;
        
        emitToHandlers('room:playerReady', {
          playerId: 'mock-player1',
          isReady: true,
          room: {
            players: internalState.room.players
          }
        } as PlayerReadyEvent);
      }
      
      // Jugador 2 se marca como listo
      setTimeout(() => {
        const player2Index = internalState.room.players.findIndex(p => p.userId === 'mock-player2');
        if (player2Index !== -1) {
          internalState.room.players[player2Index].isReady = true;
          
          emitToHandlers('room:playerReady', {
            playerId: 'mock-player2',
            isReady: true,
            room: {
              players: internalState.room.players
            }
          } as PlayerReadyEvent);
        }
        
        emitSystemMessage('El anfitrión puede comenzar el juego cuando todos estén listos.');
      }, 3000);
    }, 5000);
  };
  
  // Comprobar si todos los jugadores están listos
  const checkAllReady = () => {
    const allReady = internalState.room.players.every(p => p.isReady);
    if (allReady) {
      emitSystemMessage('¡Todos los jugadores están listos! El anfitrión puede iniciar el juego.');
      
      emitToHandlers('user:notification', {
        type: 'success',
        message: '¡Todos los jugadores están listos!'
      } as NotificationEvent);
    }
  };
  
  // Enviar mensaje del sistema
  const emitSystemMessage = (text: string) => {
    emitToHandlers('chat:message', {
      senderId: 'system',
      senderName: 'Sistema',
      text,
      timestamp: Date.now(),
      isSystem: true
    } as MessageEvent);
  };
  
  return mockSocket;
}

/**
 * Verifica si debemos usar el socket simulado
 */
export function shouldUseMockSocket(): boolean {
  return !process.env.NEXT_PUBLIC_SOCKET_URL || 
         process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_USE_MOCK_SOCKET === 'true';
}

/**
 * Crea un socket real o simulado según el entorno
 */
export function createSocketOrMock(options: MockSocketOptions, io: typeof import('socket.io-client').io): Socket | MockSocket {
  if (shouldUseMockSocket()) {
    console.log('[SOCKET] Usando socket simulado para desarrollo');
    return createMockSocket(options);
  }
  
  // Crear socket real
  try {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) throw new Error('URL de socket no configurada');
    
    return io(socketUrl, {
      auth: {
        userId: options.userId,
        username: options.username,
        token: localStorage.getItem('accessToken')
      }
    });
  } catch (error) {
    console.error('[SOCKET] Error al crear socket real, usando simulado:', error);
    return createMockSocket(options);
  }
} 