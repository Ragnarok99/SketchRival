import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
// import gameService from './gameService'; // Comentamos esta línea ya que el módulo no existe

// Enumeración para estados del juego
export enum GameState {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  DRAWING = 'DRAWING',
  GUESSING = 'GUESSING',
  VOTING = 'VOTING',
  RESULTS = 'RESULTS',
  ENDED = 'ENDED',
}

// Tipos para eventos de socket
export enum SocketEvent {
  // Eventos de conexión
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',

  // Eventos de sala
  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_UPDATED = 'room:updated',
  ROOM_PLAYER_JOINED = 'room:playerJoined',
  ROOM_PLAYER_LEFT = 'room:playerLeft',
  ROOM_PLAYER_READY = 'room:playerReady',
  ROOM_SET_READY = 'room:setReady',
  ROOM_GAME_STARTED = 'room:gameStarted',

  // Eventos de chat
  CHAT_MESSAGE = 'chat:message',
  CHAT_SEND = 'chat:send',

  // Eventos de juego
  GAME_START = 'game:start',
  GAME_UPDATE = 'game:update',
  GAME_END = 'game:end',
  GAME_TURN = 'game:turn',
  GAME_SUBMIT = 'game:submit',
  GAME_VOTE = 'game:vote',

  // Eventos de usuario
  USER_STATUS = 'user:status',
  USER_ACTIVITY = 'user:activity',
  USER_TYPING = 'user:typing',
  USER_NOTIFICATION = 'user:notification',
}

// Tipo para representar un cliente de Socket.io
export interface SocketClient {
  id: string;
  userId: string;
  username: string;
  roomId?: string;
}

// Servicio principal de Socket.io
class SocketService {
  private io: SocketServer | null = null;
  private clients: Map<string, SocketClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set of socketIds

  // Inicializar el servidor Socket.io
  initialize(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 10000,
      pingInterval: 5000,
    });

    logger.info('Socket.io server initialized');

    // Configurar middleware para autenticación
    this.io.use(this.authMiddleware.bind(this));

    // Configurar gestión de conexiones
    this.io.on(SocketEvent.CONNECT, this.handleConnection.bind(this));

    return this.io;
  }

  // Middleware para autenticar conexiones
  private async authMiddleware(socket: any, next: (err?: Error) => void) {
    try {
      const { userId, username, token } = socket.handshake.auth;

      if (!userId || !username) {
        return next(new Error('Authentication error: Missing user information'));
      }

      // Si tenemos un token JWT, verificar
      if (token) {
        try {
          jwt.verify(token, config.jwt.secret);
        } catch (error) {
          return next(new Error('Authentication error: Invalid token'));
        }
      }

      // Adjuntar información del usuario al objeto socket
      socket.user = { userId, username };
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  }

  // Manejar nueva conexión
  private handleConnection(socket: any) {
    const { userId, username } = socket.user;
    logger.info(`Socket connected: ${socket.id} (User: ${username}, ID: ${userId})`);

    // Registrar cliente
    this.clients.set(socket.id, {
      id: socket.id,
      userId,
      username,
    });

    // Configurar eventos
    this.setupRoomEvents(socket);
    this.setupChatEvents(socket);
    this.setupGameEvents(socket);
    this.setupUserEvents(socket);

    // Manejar desconexión
    socket.on(SocketEvent.DISCONNECT, () => this.handleDisconnect(socket));
  }

  // Manejar desconexión
  private handleDisconnect(socket: any) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    logger.info(`Socket disconnected: ${socket.id} (User: ${client.username})`);

    // Si el cliente estaba en una sala, notificar a otros
    if (client.roomId) {
      this.handleClientLeaveRoom(socket, client.roomId);
    }

    // Eliminar cliente
    this.clients.delete(socket.id);
  }

  // Configurar eventos relacionados con salas
  private setupRoomEvents(socket: any) {
    // Unirse a una sala
    socket.on(SocketEvent.ROOM_JOIN, async (data: any, callback: Function) => {
      try {
        const { roomId, accessCode = '' } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId) {
          return callback('Invalid request');
        }

        // TODO: Validar en base de datos si la sala existe y el accessCode es correcto
        // Por ahora, simulamos que es siempre válido

        // Añadir cliente a la sala
        this.addClientToRoom(socket, client, roomId);

        // Notificar a otros en la sala
        socket.to(roomId).emit(SocketEvent.ROOM_PLAYER_JOINED, {
          playerId: client.userId,
          playerName: client.username,
          // TODO: Obtener datos actualizados de la sala
          room: {
            id: roomId,
            players: Array.from(this.getClientsInRoom(roomId))
              .map((socketId) => {
                const c = this.clients.get(socketId);
                return c
                  ? {
                      userId: c.userId,
                      username: c.username,
                      isReady: false, // TODO: Obtener estado real
                      role: c.userId === data.hostId ? 'host' : 'player',
                    }
                  : null;
              })
              .filter(Boolean),
          },
        });

        // Devolver éxito y datos de la sala
        callback(null, {
          room: {
            id: roomId,
            // TODO: Obtener datos reales de la sala
            players: Array.from(this.getClientsInRoom(roomId))
              .map((socketId) => {
                const c = this.clients.get(socketId);
                return c
                  ? {
                      userId: c.userId,
                      username: c.username,
                      isReady: false, // TODO: Obtener estado real
                      role: c.userId === data.hostId ? 'host' : 'player',
                    }
                  : null;
              })
              .filter(Boolean),
          },
        });
      } catch (error) {
        logger.error('Error joining room:', error);
        callback('Error joining room');
      }
    });

    // Abandonar una sala
    socket.on(SocketEvent.ROOM_LEAVE, (data: any, callback?: Function) => {
      try {
        const { roomId } = data;
        if (!roomId) return callback?.('Invalid request');

        this.handleClientLeaveRoom(socket, roomId);
        callback?.();
      } catch (error) {
        logger.error('Error leaving room:', error);
        callback?.('Error leaving room');
      }
    });

    // Marcar como listo/no listo
    socket.on(SocketEvent.ROOM_SET_READY, (data: any, callback?: Function) => {
      try {
        const { roomId, isReady } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId) {
          return callback?.('Invalid request');
        }

        // TODO: Actualizar estado en base de datos

        // Notificar a todos en la sala
        this.io?.to(roomId).emit(SocketEvent.ROOM_PLAYER_READY, {
          playerId: client.userId,
          isReady,
          // TODO: Obtener datos actualizados de la sala
          room: {
            players: Array.from(this.getClientsInRoom(roomId))
              .map((socketId) => {
                const c = this.clients.get(socketId);
                return c
                  ? {
                      userId: c.userId,
                      username: c.username,
                      isReady: c.userId === client.userId ? isReady : false, // Simulado
                      role: 'player', // Simulado
                    }
                  : null;
              })
              .filter(Boolean),
          },
        });

        callback?.();
      } catch (error) {
        logger.error('Error setting ready status:', error);
        callback?.('Error setting ready status');
      }
    });

    // Iniciar juego (solo anfitrión)
    socket.on(SocketEvent.GAME_START, (data: any, callback?: Function) => {
      try {
        const { roomId } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId) {
          return callback?.('Invalid request');
        }

        // TODO: Verificar si el cliente es anfitrión y todos están listos

        // Notificar a todos que el juego comenzó
        this.io?.to(roomId).emit(SocketEvent.ROOM_GAME_STARTED, {
          roomId,
          startedById: client.userId,
        });

        callback?.();
      } catch (error) {
        logger.error('Error starting game:', error);
        callback?.('Error starting game');
      }
    });
  }

  // Configurar eventos relacionados con chat
  private setupChatEvents(socket: any) {
    socket.on(SocketEvent.CHAT_SEND, async (data: any, callback?: Function) => {
      try {
        const { roomId, text } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId || !text || !this.io) {
          return callback?.('Invalid request or service not ready');
        }

        // Obtener estado actual del juego para la sala (esto es una simplificación)
        // En una implementación real, gameService.getRoomState(roomId) devolvería el estado.
        // Aquí simularemos que podemos acceder a ello.
        // const currentGameState = await gameService.getRoomState(roomId);
        // const { currentState, currentDrawerId, currentWord } = currentGameState || {};

        // ---- INICIO DE SIMULACIÓN DE ESTADO DE JUEGO ----
        // Esto debería reemplazarse con una llamada real al servicio de estado del juego
        // o accediendo a datos de la sala que ya gestiona socketService si los tiene.
        // Para este ejemplo, asumimos que estos datos están disponibles mágicamente aquí.
        // Esta es una dependencia GRANDE que necesitaría ser resuelta para una funcionalidad real.
        let DEBUG_MOCK_GAME_STATE = 'GUESSING'; // o 'DRAWING'
        let DEBUG_MOCK_DRAWER_ID = 'mock-drawer-id'; // ID del dibujante actual
        let DEBUG_MOCK_CURRENT_WORD = 'manzana'; // Palabra a adivinar
        // Si roomId es específico, podríamos hardcodear diferentes estados para prueba.
        if (roomId === 'testRoomWithDrawingState') {
          DEBUG_MOCK_GAME_STATE = 'DRAWING';
          DEBUG_MOCK_DRAWER_ID = client.userId === 'drawerUser' ? 'otherUser' : 'drawerUser'; // Simular ser o no el dibujante
          DEBUG_MOCK_CURRENT_WORD = 'casa';
        }
        const currentState = DEBUG_MOCK_GAME_STATE as GameState; // Forzar tipo para el ejemplo
        const currentDrawerId = DEBUG_MOCK_DRAWER_ID;
        const currentWord = DEBUG_MOCK_CURRENT_WORD;
        // ---- FIN DE SIMULACIÓN DE ESTADO DE JUEGO ----

        const isGuessingPhase = currentState === GameState.GUESSING || currentState === GameState.DRAWING;
        const senderIsDrawer = client.userId === currentDrawerId;

        if (isGuessingPhase && !senderIsDrawer && currentWord) {
          // Es fase de adivinanza y el que envía no es el dibujante
          const guessNormalized = text.trim().toLowerCase();
          const wordNormalized = currentWord.trim().toLowerCase();

          if (guessNormalized === wordNormalized) {
            // ¡Adivinanza correcta!
            // TODO: Notificar al jugador que adivinó, actualizar puntos, etc.
            // gameService.handleCorrectGuess(roomId, client.userId, text);

            this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, {
              senderId: 'system',
              senderName: 'Sistema',
              text: `${client.username} ha adivinado la palabra!`,
              timestamp: Date.now(),
              isSystem: true,
            });
            // Podríamos no enviar el mensaje original al chat para no revelar la palabra
            return callback?.(); // Termina aquí, no retransmite la palabra correcta al chat
          }
        }

        // Si es el dibujante durante la fase de adivinanza/dibujo, no permitir chat (o filtrar)
        if (isGuessingPhase && senderIsDrawer) {
          // Opcional: enviar un mensaje de error/aviso solo al dibujante
          // socket.emit('user:notification', { type: 'error', message: 'No puedes chatear mientras dibujas.'});
          console.log(
            `User ${client.username} (drawer) tried to chat during drawing/guessing phase. Message blocked: ${text}`,
          );
          return callback?.('Los dibujantes no pueden chatear durante la ronda de dibujo.');
        }

        // Para todos los demás casos (chat normal, o adivinanza incorrecta), retransmitir
        const message = {
          senderId: client.userId,
          senderName: client.username,
          text,
          timestamp: Date.now(),
          isSystem: false,
        };
        this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, message);
        callback?.();
      } catch (error) {
        logger.error('Error sending chat message:', error);
        callback?.('Error sending chat message');
      }
    });
  }

  // Configurar eventos relacionados con el juego
  private setupGameEvents(socket: any) {
    // Implementar eventos específicos del juego
    socket.on(SocketEvent.GAME_SUBMIT, (data: any, callback?: Function) => {
      // Lógica para manejar envío de dibujos/respuestas
      // TODO: Implementar cuando se desarrolle el juego
      callback?.();
    });

    socket.on(SocketEvent.GAME_VOTE, (data: any, callback?: Function) => {
      // Lógica para manejar votaciones
      // TODO: Implementar cuando se desarrolle el juego
      callback?.();
    });
  }

  // Configurar eventos relacionados con usuarios
  private setupUserEvents(socket: any) {
    // Estado de actividad
    socket.on(SocketEvent.USER_ACTIVITY, (data: any) => {
      const { status } = data;
      const client = this.clients.get(socket.id);

      if (!client || !client.roomId) return;

      // Transmitir estado a otros en la sala
      socket.to(client.roomId).emit(SocketEvent.USER_STATUS, {
        userId: client.userId,
        username: client.username,
        status,
      });
    });

    // Estado de escritura
    socket.on(SocketEvent.USER_TYPING, (data: any) => {
      const { isTyping } = data;
      const client = this.clients.get(socket.id);

      if (!client || !client.roomId) return;

      // Transmitir estado a otros en la sala
      socket.to(client.roomId).emit(SocketEvent.USER_TYPING, {
        userId: client.userId,
        username: client.username,
        isTyping,
      });
    });
  }

  // Añadir cliente a una sala
  private addClientToRoom(socket: any, client: SocketClient, roomId: string) {
    // Unir socket a la sala
    socket.join(roomId);

    // Actualizar referencia del cliente
    client.roomId = roomId;
    this.clients.set(socket.id, client);

    // Registrar en el mapa de salas
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)?.add(socket.id);

    logger.info(`Client ${socket.id} (${client.username}) joined room ${roomId}`);
  }

  // Manejar salida de un cliente de una sala
  private handleClientLeaveRoom(socket: any, roomId: string) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Quitar socket de la sala
    socket.leave(roomId);

    // Actualizar referencia del cliente
    client.roomId = undefined;
    this.clients.set(socket.id, client);

    // Actualizar mapa de salas
    this.rooms.get(roomId)?.delete(socket.id);

    // Si la sala queda vacía, eliminarla
    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId);
    } else {
      // Notificar a otros en la sala
      socket.to(roomId).emit(SocketEvent.ROOM_PLAYER_LEFT, {
        playerId: client.userId,
        // TODO: Obtener datos actualizados de la sala
        room: {
          players: Array.from(this.getClientsInRoom(roomId))
            .map((socketId) => {
              const c = this.clients.get(socketId);
              return c
                ? {
                    userId: c.userId,
                    username: c.username,
                    role: 'player', // Simulado
                  }
                : null;
            })
            .filter(Boolean),
        },
      });
    }

    logger.info(`Client ${socket.id} (${client.username}) left room ${roomId}`);
  }

  // Obtener clientes en una sala
  private getClientsInRoom(roomId: string): Set<string> {
    return this.rooms.get(roomId) || new Set();
  }

  // Enviar mensaje de sistema a una sala
  sendSystemMessage(roomId: string, text: string) {
    if (!this.io) return;

    this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, {
      senderId: 'system',
      senderName: 'Sistema',
      text,
      timestamp: Date.now(),
      isSystem: true,
    });
  }

  // Enviar notificación a un usuario específico
  sendUserNotification(socketId: string, type: string, message: string) {
    const socket = this.io?.sockets.sockets.get(socketId);
    if (!socket) return;

    socket.emit(SocketEvent.USER_NOTIFICATION, { type, message });
  }

  // Enviar notificación a todos los usuarios en una sala
  sendRoomNotification(roomId: string, type: string, message: string) {
    if (!this.io) return;

    this.io.to(roomId).emit(SocketEvent.USER_NOTIFICATION, { type, message });
  }

  // Obtener instancia del servidor Socket.io
  getIO(): SocketServer | null {
    return this.io;
  }
}

export default new SocketService();
