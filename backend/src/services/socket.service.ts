import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import gameStateMachineService from './gameState.service';
import { GameEvent, GameState as GamePhase } from '../models/GameState.model';
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
  HEARTBEAT = 'heartbeat', // Nuevo evento para heartbeat
  RECONNECT_ATTEMPT = 'reconnectAttempt', // Nuevo evento para intentos de reconexión
  SYNC_REQUEST = 'sync:request', // Nuevo evento para solicitar sincronización
  SYNC_COMPLETE = 'sync:complete', // Nuevo evento para confirmar sincronización

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
  GAME_STATE_CHANGED = 'game:stateChanged', // Nuevo evento para cambios de estado
  GAME_GET_STATE = 'game:getState', // Nuevo evento
  GAME_END = 'game:end',
  GAME_TURN = 'game:turn',
  GAME_SUBMIT = 'game:submit',
  GAME_VOTE = 'game:vote',
  GAME_TIME_UPDATE = 'game:timeUpdate', // Nuevo evento para actualizaciones de tiempo

  // Eventos de usuario
  USER_STATUS = 'user:status',
  USER_ACTIVITY = 'user:activity',
  USER_TYPING = 'user:typing',
  USER_NOTIFICATION = 'user:notification',
  USER_RECONNECTED = 'user:reconnected', // Nuevo evento para reconexión de usuario
}

// Tipo para representar un cliente de Socket.io
export interface SocketClient {
  id: string;
  userId: string;
  username: string;
  roomId?: string;
  lastActivity: number; // Timestamp de última actividad
  isConnected: boolean; // Estado de conexión
  latencyMs?: number; // Latencia en ms
  deviceInfo?: string; // Información del dispositivo
}

// Tipo para mensajes en cola
interface QueuedMessage {
  event: string;
  data: any;
  roomId?: string;
  userId?: string;
  timestamp: number;
}

// Servicio principal de Socket.io
class SocketService {
  private io: SocketServer | null = null;
  private clients: Map<string, SocketClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set of socketIds

  // Nuevas propiedades para sincronización
  private readonly heartbeatInterval = 10000; // 10 segundos
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: Map<string, QueuedMessage[]> = new Map(); // userId -> mensajes
  private roomStates: Map<string, any> = new Map(); // roomId -> último estado
  private disconnectedUsers: Map<string, { timestamp: number; roomId?: string }> = new Map(); // userId -> info

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

    // Iniciar heartbeat
    this.startHeartbeat();

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

      // Detectar si es una reconexión
      const isReconnection = this.disconnectedUsers.has(userId);
      socket.isReconnection = isReconnection;

      if (isReconnection) {
        logger.info(`Reconnection detected for user ${username} (${userId})`);
      }

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  }

  // Manejar nueva conexión
  private handleConnection(socket: any) {
    const { userId, username } = socket.user;
    const isReconnection = socket.isReconnection || false;
    const deviceInfo = socket.handshake.headers['user-agent'] || 'Unknown';

    logger.info(`Socket connected: ${socket.id} (User: ${username}, ID: ${userId}, Reconnect: ${isReconnection})`);

    // Registrar cliente
    this.clients.set(socket.id, {
      id: socket.id,
      userId,
      username,
      lastActivity: Date.now(),
      isConnected: true,
      deviceInfo,
    });

    // Si es una reconexión, manejar ese flujo
    if (isReconnection) {
      this.handleReconnection(socket, userId);
    }

    // Configurar eventos
    this.setupRoomEvents(socket);
    this.setupChatEvents(socket);
    this.setupGameEvents(socket);
    this.setupUserEvents(socket);
    this.setupSyncEvents(socket);

    // Manejar desconexión
    socket.on(SocketEvent.DISCONNECT, () => this.handleDisconnect(socket));

    // Registrar latencia
    socket.on(SocketEvent.HEARTBEAT, (clientTimestamp: number) => {
      const client = this.clients.get(socket.id);
      if (client) {
        client.latencyMs = Date.now() - clientTimestamp;
        client.lastActivity = Date.now();
        this.clients.set(socket.id, client);
      }
    });
  }

  // Manejar reconexión de usuario
  private handleReconnection(socket: any, userId: string) {
    const disconnectInfo = this.disconnectedUsers.get(userId);
    if (!disconnectInfo) return;

    const { roomId } = disconnectInfo;

    // Si estaba en una sala, reincorporarle
    if (roomId) {
      const client = this.clients.get(socket.id);
      if (client) {
        this.addClientToRoom(socket, client, roomId);

        // Enviar evento de reconexión
        this.io?.to(roomId).emit(SocketEvent.USER_RECONNECTED, {
          userId,
          username: client.username,
        });

        // Enviar estado actual
        const currentState = this.roomStates.get(roomId);
        if (currentState) {
          socket.emit(SocketEvent.GAME_STATE_CHANGED, currentState);
        }

        // Procesar mensajes en cola para este usuario
        this.processQueuedMessages(userId, socket);
      }
    }

    // Eliminar de la lista de desconectados
    this.disconnectedUsers.delete(userId);
  }

  // Procesar mensajes en cola para un usuario
  private processQueuedMessages(userId: string, socket: any) {
    const messages = this.messageQueue.get(userId) || [];
    if (messages.length === 0) return;

    logger.info(`Processing ${messages.length} queued messages for user ${userId}`);

    // Ordenar por timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // Enviar mensajes al cliente
    for (const msg of messages) {
      socket.emit(msg.event, msg.data);
    }

    // Limpiar cola
    this.messageQueue.delete(userId);
  }

  // Manejar desconexión
  private handleDisconnect(socket: any) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    logger.info(`Socket disconnected: ${socket.id} (User: ${client.username})`);

    // Registrar usuario como desconectado (para posible reconexión)
    this.disconnectedUsers.set(client.userId, {
      timestamp: Date.now(),
      roomId: client.roomId,
    });

    // Marcarlo como desconectado pero no eliminarlo inmediatamente
    client.isConnected = false;
    this.clients.set(socket.id, client);

    // Si el cliente estaba en una sala, notificar a otros pero mantenerlo ahí por un tiempo
    if (client.roomId) {
      // Notificar desconexión temporal
      socket.to(client.roomId).emit(SocketEvent.USER_STATUS, {
        userId: client.userId,
        username: client.username,
        status: 'disconnected',
        temporary: true,
      });

      // Programar eliminación completa si no se reconecta en X tiempo
      setTimeout(() => {
        // Verificar si sigue desconectado
        if (this.disconnectedUsers.has(client.userId)) {
          this.handleClientLeaveRoom(socket, client.roomId!);
          this.clients.delete(socket.id);
          logger.info(`Removing disconnected client ${client.username} after timeout`);
        }
      }, 60000); // 1 minuto de espera
    } else {
      // Si no estaba en una sala, eliminar inmediatamente
      this.clients.delete(socket.id);
    }
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

        // Obtener el estado actual de la sala si existe
        const currentState = this.roomStates.get(roomId);

        // Construir respuesta
        const responseData = {
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
          // Incluir estado del juego si existe
          gameState: currentState || null,
        };

        // Devolver éxito y datos de la sala
        callback(null, responseData);
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

  // Eventos para sincronización de estado del juego
  private setupSyncEvents(socket: any) {
    // Solicitud de sincronización
    socket.on(SocketEvent.SYNC_REQUEST, (data: any, callback?: Function) => {
      try {
        const { roomId, lastTimestamp } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId) {
          return callback?.({ success: false, error: 'Invalid request' });
        }

        // Obtener estado actual
        const currentState = this.roomStates.get(roomId);

        if (!currentState) {
          return callback?.({ success: false, error: 'No state available' });
        }

        // Responder con el estado actual
        callback?.({
          success: true,
          state: currentState,
          timestamp: Date.now(),
        });

        // Actualizar timestamp de actividad
        client.lastActivity = Date.now();
        this.clients.set(socket.id, client);
      } catch (error) {
        logger.error('Error syncing state:', error);
        callback?.({ success: false, error: 'Error syncing state' });
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

    // Manejar solicitud de estado del juego
    socket.on(
      SocketEvent.GAME_GET_STATE,
      async (data: { roomId: string }, callback: (error: any, state: any) => void) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            logger.warn('game:getState llamado sin roomId');
            return callback({ message: 'Room ID is required for game:getState' }, null);
          }

          const client = this.clients.get(socket.id);
          logger.info(`User ${client?.username || 'Unknown'} (${socket.id}) requested game state for room ${roomId}`);

          const gameState = await gameStateMachineService.getGameState(roomId);

          if (!gameState) {
            logger.warn(`No game state found by gameStateMachineService for room ${roomId}. Returning null.`);
            // Es posible que la sala exista pero el juego aún no haya comenzado formalmente (sin estado en la máquina).
            // El cliente debería poder manejar un estado nulo o un estado inicial por defecto.
            return callback(null, null);
          }

          // Opcional: Actualizar cache interna si gameStateMachineService tiene el estado más reciente.
          // this.updateRoomState(roomId, gameState);

          logger.info(`Returning game state for room ${roomId} to ${client?.username || 'Unknown'}`);
          callback(null, gameState);
        } catch (error: any) {
          logger.error(`Error in game:getState for room ${data?.roomId}:`, error);
          callback({ message: error.message || 'Failed to get game state from server' }, null);
        }
      },
    );
  }

  // Iniciar el heartbeat para mantener conexiones activas
  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      // Enviar heartbeat a todos los clientes
      if (this.io) {
        this.io.emit(SocketEvent.HEARTBEAT, { timestamp: Date.now() });

        // Detectar clientes inactivos
        this.checkInactiveClients();
      }
    }, this.heartbeatInterval);

    logger.info(`Heartbeat started with interval of ${this.heartbeatInterval}ms`);
  }

  // Verificar clientes inactivos
  private checkInactiveClients() {
    const now = Date.now();
    const inactivityThreshold = 3 * this.heartbeatInterval; // 3 veces el intervalo de heartbeat

    for (const [socketId, client] of this.clients.entries()) {
      // Si el cliente está conectado pero no ha tenido actividad
      if (client.isConnected && now - client.lastActivity > inactivityThreshold) {
        logger.warn(
          `Client ${client.username} (${socketId}) inactive for too long, marking as potentially disconnected`,
        );

        // Actualizar estado de conexión
        client.isConnected = false;
        this.clients.set(socketId, client);

        // Notificar a los demás si está en una sala
        if (client.roomId) {
          this.io?.to(client.roomId).emit(SocketEvent.USER_STATUS, {
            userId: client.userId,
            username: client.username,
            status: 'inactive',
          });
        }
      }
    }
  }

  // Configurar eventos relacionados con chat
  private setupChatEvents(socket: any) {
    socket.on(SocketEvent.CHAT_SEND, async (data: any, callback?: Function) => {
      try {
        const { roomId, text } = data;
        const client = this.clients.get(socket.id);

        if (!client || !roomId || !text || !this.io) {
          return callback?.({ success: false, error: 'Invalid request or service not ready' });
        }

        // Obtener el estado REAL del juego desde gameStateService
        const currentGameState = await gameStateMachineService.getGameState(roomId);

        if (!currentGameState) {
          // Si no hay estado de juego, simplemente retransmitir como chat normal (o error)
          logger.warn(`No game state found for room ${roomId} during chat send. Relaying message.`);
          const message = {
            senderId: client.userId,
            senderName: client.username,
            text,
            timestamp: Date.now(),
            isSystem: false,
          };
          this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, message);
          return callback?.({ success: true });
        }

        const { currentState, currentDrawerId, currentWord } = currentGameState;
        const gamePhase = currentState as unknown as GamePhase; // Castear a GamePhase importado

        const isDrawingOrGuessingPhase = gamePhase === GamePhase.DRAWING || gamePhase === GamePhase.GUESSING;
        const senderIsDrawer = client.userId === currentDrawerId?.toString();

        // Si es el dibujante durante la fase de dibujo/adivinanza, no permitir chat
        if (isDrawingOrGuessingPhase && senderIsDrawer) {
          logger.info(`User ${client.username} (drawer) tried to chat during active phase. Message blocked: ${text}`);
          // Notificar solo al dibujante
          socket.emit(SocketEvent.USER_NOTIFICATION, {
            type: 'warning',
            message: 'No puedes enviar mensajes mientras dibujas o esperan tu dibujo.',
          });
          return callback?.({ success: false, error: 'Los dibujantes no pueden chatear durante la ronda.' });
        }

        // Si es fase de adivinanza, no es el dibujante, y hay palabra actual
        if (gamePhase === GamePhase.GUESSING && !senderIsDrawer && currentWord) {
          const guessNormalized = text.trim().toLowerCase();
          const wordNormalized = currentWord.trim().toLowerCase();

          if (guessNormalized === wordNormalized) {
            // Adivinanza correcta: procesar a través de la máquina de estados
            logger.info(`${client.username} guessed correctly in room ${roomId}. Word: ${currentWord}`);
            try {
              await gameStateMachineService.processEvent(
                roomId,
                GameEvent.SUBMIT_GUESS,
                { guess: text, username: client.username }, // payload para SUBMIT_GUESS
                client.userId,
              );
              // La máquina de estados se encargará de notificar puntajes y transiciones
              // No enviar el mensaje original al chat para no revelar la palabra
              return callback?.({ success: true, correctGuess: true });
            } catch (gameError: any) {
              logger.error(`Error processing correct guess for ${client.username} in room ${roomId}:`, gameError);
              // Notificar al usuario que hubo un problema procesando su adivinanza correcta
              socket.emit(SocketEvent.USER_NOTIFICATION, {
                type: 'error',
                message: `Hubo un problema al procesar tu adivinanza: ${gameError.message}`,
              });
              return callback?.({ success: false, error: 'Error procesando adivinanza.' });
            }
          }
        }

        // Para todos los demás casos (chat normal, o adivinanza incorrecta en fase de adivinanza), retransmitir
        const messageToRelay = {
          senderId: client.userId,
          senderName: client.username,
          text,
          timestamp: Date.now(),
          isSystem: false,
        };
        this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, messageToRelay);

        // Actualizar timestamp de actividad del cliente
        client.lastActivity = Date.now();
        this.clients.set(socket.id, client);

        callback?.({ success: true, correctGuess: false });
      } catch (error: any) {
        logger.error('Error sending chat message:', error);
        callback?.({ success: false, error: error.message || 'Error interno del servidor.' });
      }
    });
  }

  // Configurar eventos relacionados con usuarios
  private setupUserEvents(socket: any) {
    // Estado de actividad
    socket.on(SocketEvent.USER_ACTIVITY, (data: any) => {
      const { status } = data;
      const client = this.clients.get(socket.id);

      if (!client || !client.roomId) return;

      // Actualizar timestamp de actividad
      client.lastActivity = Date.now();
      this.clients.set(socket.id, client);

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

      // Actualizar timestamp de actividad
      client.lastActivity = Date.now();
      this.clients.set(socket.id, client);

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
    client.lastActivity = Date.now();
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

      // Eliminar estado de la sala
      this.roomStates.delete(roomId);
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
    // Si es un ID de usuario en lugar de socket
    if (socketId.length < 20) {
      // Heurística simple para diferenciar IDs de usuario vs socket
      // Buscar todos los sockets conectados del usuario
      let found = false;
      for (const [sid, client] of this.clients.entries()) {
        if (client.userId === socketId && client.isConnected) {
          const socket = this.io?.sockets.sockets.get(sid);
          if (socket) {
            socket.emit(SocketEvent.USER_NOTIFICATION, { type, message });
            found = true;
          }
        }
      }

      // Si no se encontró socket activo, encolar mensaje
      if (!found) {
        this.queueMessageForUser(socketId, SocketEvent.USER_NOTIFICATION, { type, message });
      }
      return;
    }

    // Es un ID de socket
    const socket = this.io?.sockets.sockets.get(socketId);
    if (!socket) {
      // Buscar el userId asociado al socketId
      const client = this.clients.get(socketId);
      if (client) {
        this.queueMessageForUser(client.userId, SocketEvent.USER_NOTIFICATION, { type, message });
      }
      return;
    }

    socket.emit(SocketEvent.USER_NOTIFICATION, { type, message });
  }

  // Encolar mensaje para usuario desconectado
  private queueMessageForUser(userId: string, event: string, data: any) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }

    this.messageQueue.get(userId)?.push({
      event,
      data,
      timestamp: Date.now(),
    });

    logger.info(`Message queued for disconnected user ${userId}: ${event}`);
  }

  // Enviar notificación a todos los usuarios en una sala
  sendRoomNotification(roomId: string, type: string, message: string) {
    if (!this.io) return;

    this.io.to(roomId).emit(SocketEvent.USER_NOTIFICATION, { type, message });
  }

  // Actualizar y almacenar estado de una sala
  updateRoomState(roomId: string, state: any) {
    // Guardar el estado más reciente
    this.roomStates.set(roomId, {
      ...state,
      timestamp: Date.now(),
    });

    logger.debug(`Room state updated for ${roomId}`);
  }

  // Obtener instancia del servidor Socket.io
  getIO(): SocketServer | null {
    return this.io;
  }

  // Notificar a todos los usuarios de una sala que el juego ha comenzado
  notifyGameStarted(roomId: string, gameRoom: any) {
    if (!this.io) return;

    // Emitir evento de inicio de juego a todos en la sala
    this.io.to(roomId).emit(SocketEvent.ROOM_GAME_STARTED, {
      roomId,
      gameId: gameRoom.currentGame?.id,
      startedAt: new Date(),
    });

    // También enviar una notificación
    this.sendRoomNotification(roomId, 'success', '¡El juego ha comenzado!');

    logger.info(`Game started notification sent to room ${roomId}`);
  }
}

export default new SocketService();
