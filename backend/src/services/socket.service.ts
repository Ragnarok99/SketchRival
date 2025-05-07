import { Server, Socket } from 'socket.io';
import http from 'http';
import { Types } from 'mongoose';
import { GameMessageModel } from '../models';
import { MessageType } from '../models/GameMessage.model';
import { GamePlayerModel } from '../models';
import { PlayerStatus } from '../models/GamePlayer.model';
import { GameRoom } from '../models/gameRoom.model';
import { GamePlayer } from '../models/gamePlayer.model';
import { User } from '../models/user.model';

// Interfaz para los datos del usuario en la conexión socket
interface UserData {
  userId: string;
  username: string;
}

// Interfaz para los eventos del cliente
interface ClientToServerEvents {
  'room:join': (
    data: { roomId: string; userId: string; accessCode?: string },
    callback: (error?: string, data?: any) => void,
  ) => void;
  'room:leave': (data: { roomId: string; userId: string }, callback?: (error?: string) => void) => void;
  'room:setReady': (
    data: { roomId: string; userId: string; isReady: boolean },
    callback?: (error?: string) => void,
  ) => void;
  'chat:send': (data: { roomId: string; userId: string; text: string }, callback?: (error?: string) => void) => void;
}

// Interfaz para los eventos del servidor
interface ServerToClientEvents {
  'room:playerJoined': (data: { player: GamePlayer; room: GameRoom }) => void;
  'room:playerLeft': (data: { playerId: string; room: GameRoom }) => void;
  'room:playerReady': (data: { playerId: string; isReady: boolean; room: GameRoom }) => void;
  'room:gameStarted': (data: { room: GameRoom }) => void;
  'room:updated': (data: { room: GameRoom }) => void;
  'chat:message': (data: { senderId: string; senderName: string; text: string; timestamp: number }) => void;
  'user:notification': (data: { type: 'info' | 'warning' | 'error' | 'success'; message: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
  username: string;
  rooms: string[];
}

class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;
  private activeConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socket ids

  initialize(httpServer: http.Server) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', this.handleConnection.bind(this));

    console.log('Socket.IO initialized successfully');
    return this.io;
  }

  private handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    const userId = socket.handshake.auth?.userId;
    const username = socket.handshake.auth?.username;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Guarda los datos del usuario en el socket
    socket.data.userId = userId;
    socket.data.username = username || 'Usuario';
    socket.data.rooms = [];

    // Registra la conexión activa
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, new Set());
    }
    this.activeConnections.get(userId)?.add(socket.id);

    console.log(`User connected: ${userId} (${socket.id})`);

    // Configura los manejadores de eventos
    this.setupEventHandlers(socket);

    // Maneja la desconexión
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private setupEventHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  ) {
    // Unirse a una sala
    socket.on('room:join', async (data, callback) => {
      try {
        const { roomId, userId, accessCode } = data;

        // Aquí deberías verificar si el usuario puede unirse a la sala
        // Esto incluye verificar el código de acceso para salas privadas
        // y cualquier otra regla de negocio (número máximo de jugadores, etc.)

        // Ejemplo simplificado:
        const roomService = await import('./gameRoom.service');
        const room = await roomService.default.getRoomById(roomId);

        if (!room) {
          return callback('La sala no existe');
        }

        if (room.isPrivate && room.accessCode !== accessCode) {
          return callback('Código de acceso incorrecto');
        }

        // Unir al socket a la sala de Socket.IO
        socket.join(roomId);
        socket.data.rooms.push(roomId);

        // Obtener información del usuario
        const userService = await import('./user.service');
        const user = await userService.default.findById(userId);

        if (!user) {
          return callback('Usuario no encontrado');
        }

        // Crear o actualizar el jugador en la sala
        const playerService = await import('./gamePlayer.service');
        const player = await playerService.default.findOrCreatePlayerInRoom(userId, roomId, {
          username: user.username,
          avatarColor: user.avatarColor || '#3B82F6',
          role: room.hostId === userId ? 'host' : 'player',
        });

        // Notificar a todos en la sala que un nuevo jugador se ha unido
        this.io?.to(roomId).emit('room:playerJoined', {
          player,
          room: await roomService.default.getRoomById(roomId),
        });

        // Enviar notificación al nuevo jugador
        socket.emit('user:notification', {
          type: 'success',
          message: `Te has unido a la sala: ${room.name}`,
        });

        // Enviar notificación a todos los demás en la sala
        socket.to(roomId).emit('chat:message', {
          senderId: 'system',
          senderName: 'Sistema',
          text: `${user.username} se ha unido a la sala`,
          timestamp: Date.now(),
        });

        callback(undefined, { room, player });
      } catch (error) {
        console.error('Error en room:join:', error);
        callback(`Error al unirse a la sala: ${(error as Error).message}`);
      }
    });

    // Salir de una sala
    socket.on('room:leave', async (data, callback) => {
      try {
        const { roomId, userId } = data;

        // Verificar si el usuario está en la sala
        if (!socket.data.rooms.includes(roomId)) {
          return callback && callback('No estás en esta sala');
        }

        // Salir del socket
        socket.leave(roomId);
        socket.data.rooms = socket.data.rooms.filter((id) => id !== roomId);

        // Obtener servicios
        const roomService = await import('./gameRoom.service');
        const playerService = await import('./gamePlayer.service');

        // Eliminar al jugador de la sala
        await playerService.default.removePlayerFromRoom(userId, roomId);

        // Obtener la sala actualizada
        const updatedRoom = await roomService.default.getRoomById(roomId);

        if (updatedRoom) {
          // Notificar a todos en la sala que un jugador se ha ido
          this.io?.to(roomId).emit('room:playerLeft', {
            playerId: userId,
            room: updatedRoom,
          });

          // Enviar mensaje al chat
          this.io?.to(roomId).emit('chat:message', {
            senderId: 'system',
            senderName: 'Sistema',
            text: `${socket.data.username} ha abandonado la sala`,
            timestamp: Date.now(),
          });
        }

        callback && callback();
      } catch (error) {
        console.error('Error en room:leave:', error);
        callback && callback(`Error al salir de la sala: ${(error as Error).message}`);
      }
    });

    // Cambiar estado de "listo"
    socket.on('room:setReady', async (data, callback) => {
      try {
        const { roomId, userId, isReady } = data;

        // Verificar si el usuario está en la sala
        if (!socket.data.rooms.includes(roomId)) {
          return callback && callback('No estás en esta sala');
        }

        // Obtener servicios
        const roomService = await import('./gameRoom.service');
        const playerService = await import('./gamePlayer.service');

        // Actualizar estado del jugador
        await playerService.default.updatePlayerStatus(userId, roomId, isReady);

        // Obtener sala actualizada
        const updatedRoom = await roomService.default.getRoomById(roomId);

        // Notificar a todos en la sala
        this.io?.to(roomId).emit('room:playerReady', {
          playerId: userId,
          isReady,
          room: updatedRoom,
        });

        // Enviar mensaje al chat
        this.io?.to(roomId).emit('chat:message', {
          senderId: 'system',
          senderName: 'Sistema',
          text: `${socket.data.username} está ${isReady ? 'listo' : 'no listo'}`,
          timestamp: Date.now(),
        });

        callback && callback();
      } catch (error) {
        console.error('Error en room:setReady:', error);
        callback && callback(`Error al cambiar estado: ${(error as Error).message}`);
      }
    });

    // Enviar mensaje de chat
    socket.on('chat:send', async (data, callback) => {
      try {
        const { roomId, userId, text } = data;

        // Verificar si el usuario está en la sala
        if (!socket.data.rooms.includes(roomId)) {
          return callback && callback('No estás en esta sala');
        }

        // Validar mensaje
        if (!text || text.trim() === '') {
          return callback && callback('El mensaje no puede estar vacío');
        }

        // Obtener información del usuario
        const userService = await import('./user.service');
        const user = await userService.default.findById(userId);

        if (!user) {
          return callback && callback('Usuario no encontrado');
        }

        // Enviar mensaje a todos en la sala
        this.io?.to(roomId).emit('chat:message', {
          senderId: userId,
          senderName: user.username,
          text,
          timestamp: Date.now(),
        });

        callback && callback();
      } catch (error) {
        console.error('Error en chat:send:', error);
        callback && callback(`Error al enviar mensaje: ${(error as Error).message}`);
      }
    });
  }

  private handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;

    if (userId) {
      // Eliminar este socket de las conexiones activas
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.activeConnections.delete(userId);
        }
      }

      console.log(`User disconnected: ${userId} (${socket.id})`);

      // Para cada sala a la que el socket estaba unido
      for (const roomId of socket.data.rooms) {
        // Solo manejar si el usuario no tiene otros sockets activos en esta sala
        const otherSocketInRoom = [...(this.activeConnections.get(userId) || [])].some((socketId) => {
          const socket = this.io?.sockets.sockets.get(socketId);
          return socket && socket.data.rooms.includes(roomId);
        });

        if (!otherSocketInRoom) {
          // Si no hay otros sockets del usuario en esta sala,
          // manejamos esto como si el usuario hubiera salido de la sala manualmente
          this.handleUserLeaveRoom(userId, roomId);
        }
      }
    }
  }

  private async handleUserLeaveRoom(userId: string, roomId: string) {
    try {
      // Este método se llama cuando un usuario se desconecta y no tiene otros sockets en la sala
      // Difiere de 'room:leave' en que no hay socket para responder

      const roomService = await import('./gameRoom.service');
      const playerService = await import('./gamePlayer.service');
      const userService = await import('./user.service');

      // Obtener usuario
      const user = await userService.default.findById(userId);

      // Eliminar al jugador de la sala
      await playerService.default.removePlayerFromRoom(userId, roomId);

      // Obtener la sala actualizada
      const updatedRoom = await roomService.default.getRoomById(roomId);

      if (updatedRoom) {
        // Notificar a todos en la sala que un jugador se ha ido
        this.io?.to(roomId).emit('room:playerLeft', {
          playerId: userId,
          room: updatedRoom,
        });

        // Enviar mensaje al chat
        this.io?.to(roomId).emit('chat:message', {
          senderId: 'system',
          senderName: 'Sistema',
          text: `${user?.username || 'Un jugador'} se ha desconectado`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error en handleUserLeaveRoom:', error);
    }
  }

  // Métodos públicos para usar desde otros servicios

  // Enviar un mensaje de chat del sistema
  async sendSystemChatMessage(roomId: string, text: string) {
    this.io?.to(roomId).emit('chat:message', {
      senderId: 'system',
      senderName: 'Sistema',
      text,
      timestamp: Date.now(),
    });
  }

  // Notificar que un juego ha comenzado
  async notifyGameStarted(roomId: string, room: GameRoom) {
    this.io?.to(roomId).emit('room:gameStarted', { room });

    // También enviamos un mensaje de chat
    this.sendSystemChatMessage(roomId, '¡El juego ha comenzado!');
  }

  // Enviar una actualización de sala
  async sendRoomUpdate(roomId: string, room: GameRoom) {
    this.io?.to(roomId).emit('room:updated', { room });
  }

  // Enviar una notificación a un usuario específico
  async sendUserNotification(userId: string, type: 'info' | 'warning' | 'error' | 'success', message: string) {
    const socketIds = this.activeConnections.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io?.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('user:notification', { type, message });
        }
      }
    }
  }

  // Verificar si un usuario está conectado
  isUserConnected(userId: string): boolean {
    return this.activeConnections.has(userId) && this.activeConnections.get(userId)!.size > 0;
  }

  // Obtener instancia de IO
  getIO() {
    return this.io;
  }
}

export default new SocketService();

// Eventos y métodos relacionados con el juego
// Exportar función para enviar actualización de estado del juego
export const sendGameStateUpdate = (roomId: string, gameState: any) => {
  if (io) {
    io.to(roomId).emit('game:stateChanged', {
      state: gameState.currentState,
      data: {
        currentRound: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        timeRemaining: gameState.timeRemaining,
        currentDrawerId: gameState.currentDrawerId,
        scores: gameState.scores ? Object.fromEntries(gameState.scores) : {},
      },
    });
  }
};

// Enviar opciones de palabras al dibujante
export const sendWordOptions = (userId: string, options: string[], timeRemaining: number) => {
  if (io) {
    io.to(userId).emit('game:wordSelection', {
      options,
      timeRemaining,
    });
  }
};

// Enviar notificación de dibujo enviado
export const sendDrawingSubmitted = (
  roomId: string,
  drawingId: string,
  imageData: string,
  drawerId: string,
  timeRemaining: number,
) => {
  if (io) {
    io.to(roomId).emit('game:drawingSubmitted', {
      drawingId,
      imageData,
      drawerId,
      timeRemaining,
    });
  }
};

// Enviar actualización de puntuaciones
export const sendScoreUpdate = (roomId: string, scores: Map<string, number>) => {
  if (io) {
    io.to(roomId).emit('game:scoreUpdated', {
      scores: Object.fromEntries(scores),
    });
  }
};

// Enviar resultados finales del juego
export const sendGameEnded = (
  roomId: string,
  winner: { id: string; name: string; score: number },
  scores: Map<string, number>,
) => {
  if (io) {
    io.to(roomId).emit('game:gameEnded', {
      winner,
      scores: Object.fromEntries(scores),
    });
  }
};
