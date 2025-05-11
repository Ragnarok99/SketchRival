"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvent = exports.GameState = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const gameState_service_1 = __importDefault(require("./gameState.service"));
const GameState_model_1 = require("../models/GameState.model");
const gameRoomsService = __importStar(require("./gameRooms.service"));
const gamePlayerService = __importStar(require("./gamePlayer.service"));
const models_1 = require("../models");
const mongoose_1 = require("mongoose");
const waitingRoomService = __importStar(require("./waitingRoom.service"));
// import gameService from './gameService'; // Comentamos esta línea ya que el módulo no existe
// Enumeración para estados del juego
var GameState;
(function (GameState) {
    GameState["WAITING"] = "WAITING";
    GameState["STARTING"] = "STARTING";
    GameState["DRAWING"] = "DRAWING";
    GameState["GUESSING"] = "GUESSING";
    GameState["VOTING"] = "VOTING";
    GameState["RESULTS"] = "RESULTS";
    GameState["ENDED"] = "ENDED";
})(GameState || (exports.GameState = GameState = {}));
// Tipos para eventos de socket
var SocketEvent;
(function (SocketEvent) {
    // Eventos de conexión
    SocketEvent["CONNECT"] = "connect";
    SocketEvent["DISCONNECT"] = "disconnect";
    SocketEvent["ERROR"] = "error";
    SocketEvent["RECONNECT"] = "reconnect";
    SocketEvent["HEARTBEAT"] = "heartbeat";
    SocketEvent["RECONNECT_ATTEMPT"] = "reconnectAttempt";
    SocketEvent["SYNC_REQUEST"] = "sync:request";
    SocketEvent["SYNC_COMPLETE"] = "sync:complete";
    // Eventos de sala
    SocketEvent["ROOM_JOIN"] = "room:join";
    SocketEvent["ROOM_LEAVE"] = "room:leave";
    SocketEvent["ROOM_UPDATED"] = "room:updated";
    SocketEvent["ROOM_PLAYER_JOINED"] = "room:playerJoined";
    SocketEvent["ROOM_PLAYER_LEFT"] = "room:playerLeft";
    SocketEvent["ROOM_PLAYER_READY"] = "room:playerReady";
    SocketEvent["ROOM_SET_READY"] = "room:setReady";
    SocketEvent["ROOM_GAME_STARTED"] = "room:gameStarted";
    // Eventos de chat
    SocketEvent["CHAT_MESSAGE"] = "chat:message";
    SocketEvent["CHAT_SEND"] = "chat:send";
    // Eventos de juego
    SocketEvent["GAME_START"] = "game:start";
    SocketEvent["GAME_UPDATE"] = "game:update";
    SocketEvent["GAME_STATE_CHANGED"] = "game:stateChanged";
    SocketEvent["GAME_GET_STATE"] = "game:getState";
    SocketEvent["GAME_END"] = "game:end";
    SocketEvent["GAME_TURN"] = "game:turn";
    SocketEvent["GAME_SUBMIT"] = "game:submit";
    SocketEvent["GAME_VOTE"] = "game:vote";
    SocketEvent["GAME_TIME_UPDATE"] = "game:timeUpdate";
    // Eventos de usuario
    SocketEvent["USER_STATUS"] = "user:status";
    SocketEvent["USER_ACTIVITY"] = "user:activity";
    SocketEvent["USER_TYPING"] = "user:typing";
    SocketEvent["USER_NOTIFICATION"] = "user:notification";
    SocketEvent["USER_RECONNECTED"] = "user:reconnected";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
// Servicio principal de Socket.io
class SocketService {
    constructor() {
        this.io = null;
        this.clients = new Map();
        this.rooms = new Map(); // roomId -> Set of socketIds
        // Nuevas propiedades para sincronización
        this.heartbeatInterval = 10000; // 10 segundos
        this.heartbeatTimer = null;
        this.messageQueue = new Map(); // userId -> mensajes
        this.roomStates = new Map(); // roomId -> último estado
        this.disconnectedUsers = new Map(); // userId -> info
    }
    // Inicializar el servidor Socket.io
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: config_1.default.corsOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingTimeout: 10000,
            pingInterval: 5000,
        });
        logger_1.default.info('Socket.io server initialized');
        // Configurar middleware para autenticación
        this.io.use(this.authMiddleware.bind(this));
        // Configurar gestión de conexiones
        this.io.on(SocketEvent.CONNECT, this.handleConnection.bind(this));
        // Iniciar heartbeat
        this.startHeartbeat();
        return this.io;
    }
    // Middleware para autenticar conexiones
    authMiddleware(socket, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, username, token } = socket.handshake.auth;
                if (!userId || !username) {
                    return next(new Error('Authentication error: Missing user information'));
                }
                // Si tenemos un token JWT, verificar
                if (token) {
                    try {
                        jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
                    }
                    catch (error) {
                        return next(new Error('Authentication error: Invalid token'));
                    }
                }
                // Adjuntar información del usuario al objeto socket
                socket.user = { userId, username };
                // Detectar si es una reconexión
                const isReconnection = this.disconnectedUsers.has(userId);
                socket.isReconnection = isReconnection;
                if (isReconnection) {
                    logger_1.default.info(`Reconnection detected for user ${username} (${userId})`);
                }
                next();
            }
            catch (error) {
                logger_1.default.error('Socket authentication error:', error);
                next(new Error('Authentication error'));
            }
        });
    }
    // Manejar nueva conexión
    handleConnection(socket) {
        const { userId, username } = socket.user;
        const isReconnection = socket.isReconnection || false;
        const deviceInfo = socket.handshake.headers['user-agent'] || 'Unknown';
        logger_1.default.info(`Socket connected: ${socket.id} (User: ${username}, ID: ${userId}, Reconnect: ${isReconnection})`);
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
        socket.on(SocketEvent.HEARTBEAT, (clientTimestamp) => {
            const client = this.clients.get(socket.id);
            if (client) {
                client.latencyMs = Date.now() - clientTimestamp;
                client.lastActivity = Date.now();
                this.clients.set(socket.id, client);
            }
        });
    }
    // Manejar reconexión de usuario
    handleReconnection(socket, userId) {
        var _a;
        const disconnectInfo = this.disconnectedUsers.get(userId);
        if (!disconnectInfo)
            return;
        const { roomId } = disconnectInfo;
        // Si estaba en una sala, reincorporarle
        if (roomId) {
            const client = this.clients.get(socket.id);
            if (client) {
                this.addClientToRoom(socket, client, roomId);
                // Enviar evento de reconexión
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(roomId).emit(SocketEvent.USER_RECONNECTED, {
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
    processQueuedMessages(userId, socket) {
        const messages = this.messageQueue.get(userId) || [];
        if (messages.length === 0)
            return;
        logger_1.default.info(`Processing ${messages.length} queued messages for user ${userId}`);
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
    handleDisconnect(socket) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
        logger_1.default.info(`Socket disconnected: ${socket.id} (User: ${client.username})`);
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
                    this.handleClientLeaveRoom(socket, client.roomId);
                    this.clients.delete(socket.id);
                    logger_1.default.info(`Removing disconnected client ${client.username} after timeout`);
                }
            }, 60000); // 1 minuto de espera
        }
        else {
            // Si no estaba en una sala, eliminar inmediatamente
            this.clients.delete(socket.id);
        }
    }
    // Configurar eventos relacionados con salas
    setupRoomEvents(socket) {
        // Unirse a una sala
        socket.on(SocketEvent.ROOM_JOIN, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId, accessCode = '' } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback('Invalid request');
                }
                // Validar en base de datos si la sala existe y el accessCode es correcto
                try {
                    yield gameRoomsService.validateRoomAccessCode(roomId, accessCode);
                }
                catch (error) {
                    return callback('Invalid access code or room not found');
                }
                // Añadir cliente a la sala en la base de datos
                try {
                    yield gameRoomsService.addUserToRoom({
                        roomId,
                        userId: client.userId,
                        username: client.username,
                    });
                }
                catch (error) {
                    logger_1.default.error(`Error adding user ${client.userId} to room ${roomId} in database:`, error);
                    return callback('Error joining room in database');
                }
                // Añadir cliente a la sala en memoria
                this.addClientToRoom(socket, client, roomId);
                // Obtener datos actualizados de la sala y jugadores desde la base de datos
                const playersData = yield models_1.GamePlayerModel.find({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                    status: { $ne: 'left' }, // Excluir jugadores que han abandonado
                }).lean();
                const formattedPlayers = playersData.map((player) => ({
                    userId: player.userId.toString(),
                    username: player.username,
                    isReady: player.isReady || false,
                    role: player.role || 'player',
                }));
                // Notificar a otros en la sala
                socket.to(roomId).emit(SocketEvent.ROOM_PLAYER_JOINED, {
                    playerId: client.userId,
                    playerName: client.username,
                    room: {
                        id: roomId,
                        players: formattedPlayers,
                    },
                });
                // Obtener el estado actual de la sala si existe
                const currentState = this.roomStates.get(roomId);
                // Construir respuesta
                const responseData = {
                    room: {
                        id: roomId,
                        players: formattedPlayers,
                    },
                    // Incluir estado del juego si existe
                    gameState: currentState || null,
                };
                // Devolver éxito y datos de la sala
                callback(null, responseData);
            }
            catch (error) {
                logger_1.default.error('Error joining room:', error);
                callback('Error joining room');
            }
        }));
        // Abandonar una sala
        socket.on(SocketEvent.ROOM_LEAVE, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId } = data;
                const client = this.clients.get(socket.id);
                if (!roomId)
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                if (!client)
                    return callback === null || callback === void 0 ? void 0 : callback('Client not found');
                // Actualizar la base de datos
                try {
                    yield gameRoomsService.leaveRoom(roomId, client.userId, client.username);
                }
                catch (error) {
                    logger_1.default.error(`Error removing user ${client.userId} from room ${roomId} in database:`, error);
                    // Continuamos con la desconexión en memoria aunque falle la BD
                }
                // Actualizar la memoria y enviar notificación a los demás jugadores
                // handleClientLeaveRoom ya se encarga de enviar el evento ROOM_PLAYER_LEFT
                yield this.handleClientLeaveRoom(socket, roomId);
                // Ya no necesitamos duplicar el evento aquí, ya se envía en handleClientLeaveRoom
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error leaving room:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error leaving room');
            }
        }));
        // Marcar como listo/no listo
        socket.on(SocketEvent.ROOM_SET_READY, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { roomId, isReady } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                }
                // Actualizar estado en base de datos
                try {
                    yield waitingRoomService.setPlayerReady(roomId, client.userId, isReady);
                }
                catch (error) {
                    logger_1.default.error('Error updating player ready status in database:', error);
                    return callback === null || callback === void 0 ? void 0 : callback('Error updating ready status');
                }
                // Obtener datos actualizados de la sala desde la base de datos
                const playersData = yield models_1.GamePlayerModel.find({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                    status: { $ne: 'left' }, // Excluir jugadores que han abandonado
                }).lean();
                const formattedPlayers = playersData.map((player) => ({
                    userId: player.userId.toString(),
                    username: player.username,
                    isReady: player.isReady || false,
                    role: player.role || 'player',
                    avatarColor: player.avatarColor || '#3b82f6',
                }));
                // Notificar a todos en la sala con datos actualizados
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(roomId).emit(SocketEvent.ROOM_PLAYER_READY, {
                    playerId: client.userId,
                    isReady,
                    room: {
                        id: roomId,
                        players: formattedPlayers,
                    },
                });
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error setting ready status:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error setting ready status');
            }
        }));
        // Iniciar juego (solo anfitrión)
        socket.on(SocketEvent.GAME_START, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { roomId } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                }
                // Verificar si el cliente es anfitrión y todos están listos
                const readyStatus = yield gamePlayerService.getRoomReadyStatus(roomId);
                if (!readyStatus.canStart) {
                    return callback === null || callback === void 0 ? void 0 : callback('Not all players are ready or not enough players');
                }
                // Obtener datos actualizados de la sala desde la base de datos
                const playersData = yield models_1.GamePlayerModel.find({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                    status: { $ne: 'left' }, // Excluir jugadores que han abandonado
                }).lean();
                const formattedPlayers = playersData.map((player) => ({
                    userId: player.userId.toString(),
                    username: player.username,
                    isReady: player.isReady || false,
                    role: player.role || 'player',
                    avatarColor: player.avatarColor || '#3b82f6',
                }));
                // Notificar a todos que el juego comenzó
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(roomId).emit(SocketEvent.ROOM_GAME_STARTED, {
                    roomId,
                    startedById: client.userId,
                    room: {
                        id: roomId,
                        players: formattedPlayers,
                    },
                });
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error starting game:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error starting game');
            }
        }));
    }
    // Eventos para sincronización de estado del juego
    setupSyncEvents(socket) {
        // Solicitud de sincronización
        socket.on(SocketEvent.SYNC_REQUEST, (data, callback) => {
            try {
                const { roomId, lastTimestamp } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Invalid request' });
                }
                // Obtener estado actual
                const currentState = this.roomStates.get(roomId);
                if (!currentState) {
                    return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'No state available' });
                }
                // Responder con el estado actual
                callback === null || callback === void 0 ? void 0 : callback({
                    success: true,
                    state: currentState,
                    timestamp: Date.now(),
                });
                // Actualizar timestamp de actividad
                client.lastActivity = Date.now();
                this.clients.set(socket.id, client);
            }
            catch (error) {
                logger_1.default.error('Error syncing state:', error);
                callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Error syncing state' });
            }
        });
    }
    // Configurar eventos relacionados con el juego
    setupGameEvents(socket) {
        // Implementar eventos específicos del juego
        socket.on(SocketEvent.GAME_SUBMIT, (data, callback) => {
            // Lógica para manejar envío de dibujos/respuestas
            // TODO: Implementar cuando se desarrolle el juego
            callback === null || callback === void 0 ? void 0 : callback();
        });
        socket.on(SocketEvent.GAME_VOTE, (data, callback) => {
            // Lógica para manejar votaciones
            // TODO: Implementar cuando se desarrolle el juego
            callback === null || callback === void 0 ? void 0 : callback();
        });
        // Manejar solicitud de estado del juego
        socket.on(SocketEvent.GAME_GET_STATE, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            console.log('[SocketService] game:getState RECIBIDO con data:', data);
            try {
                const { roomId, gameId } = data;
                const client = this.clients.get(socket.id);
                if (!client) {
                    logger_1.default.warn('game:getState called by unknown client');
                    return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Unknown client' });
                }
                if (!roomId && !gameId) {
                    logger_1.default.warn(`game:getState called without roomId or gameId by user ${client.username} (ID: ${client.userId})`);
                    return callback === null || callback === void 0 ? void 0 : callback({
                        success: false,
                        error: 'Room ID or Game ID is required for game:getState',
                        code: 'GET_STATE_ERROR',
                    });
                }
                // Si solo se provee gameId, intentar obtener roomId (esto es un ejemplo, la lógica real puede variar)
                // const actualRoomId = roomId || await this.getRoomIdFromGameId(gameId);
                const actualRoomId = roomId; // Por ahora, usamos el roomId si está presente
                if (!actualRoomId) {
                    logger_1.default.warn(`game:getState unable to determine roomId from data: ${JSON.stringify(data)}`);
                    return callback === null || callback === void 0 ? void 0 : callback({
                        success: false,
                        error: 'Could not determine Room ID for game:getState',
                        code: 'GET_STATE_NO_ROOM_ID',
                    });
                }
                logger_1.default.info(`User ${client.username} (${socket.id}) requested game state for room ${actualRoomId}`);
                const gameState = yield gameState_service_1.default.getGameState(actualRoomId);
                if (!gameState) {
                    logger_1.default.warn(`No game state found by gameStateMachineService for room ${actualRoomId}. Returning null.`);
                    return callback === null || callback === void 0 ? void 0 : callback(null, null); // Devolver null para error y estado si no se encuentra el estado
                }
                logger_1.default.info(`Returning game state for room ${actualRoomId} to ${client.username}`);
                callback === null || callback === void 0 ? void 0 : callback(null, gameState); // Devolver null para error y el estado del juego
            }
            catch (error) {
                logger_1.default.error(`Error in game:getState for data ${JSON.stringify(data)}:`, error);
                callback === null || callback === void 0 ? void 0 : callback({ message: error.message || 'Failed to get game state from server' }, null);
            }
        }));
    }
    // Iniciar el heartbeat para mantener conexiones activas
    startHeartbeat() {
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
        logger_1.default.info(`Heartbeat started with interval of ${this.heartbeatInterval}ms`);
    }
    // Verificar clientes inactivos
    checkInactiveClients() {
        var _a;
        const now = Date.now();
        const inactivityThreshold = 3 * this.heartbeatInterval; // 3 veces el intervalo de heartbeat
        for (const [socketId, client] of this.clients.entries()) {
            // Si el cliente está conectado pero no ha tenido actividad
            if (client.isConnected && now - client.lastActivity > inactivityThreshold) {
                logger_1.default.warn(`Client ${client.username} (${socketId}) inactive for too long, marking as potentially disconnected`);
                // Actualizar estado de conexión
                client.isConnected = false;
                this.clients.set(socketId, client);
                // Notificar a los demás si está en una sala
                if (client.roomId) {
                    (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(client.roomId).emit(SocketEvent.USER_STATUS, {
                        userId: client.userId,
                        username: client.username,
                        status: 'inactive',
                    });
                }
            }
        }
    }
    // Configurar eventos relacionados con chat
    setupChatEvents(socket) {
        socket.on(SocketEvent.CHAT_SEND, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId, text } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId || !text || !this.io) {
                    return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Invalid request or service not ready' });
                }
                // Obtener el estado REAL del juego desde gameStateService
                const currentGameState = yield gameState_service_1.default.getGameState(roomId);
                if (!currentGameState) {
                    // Si no hay estado de juego, simplemente retransmitir como chat normal (o error)
                    logger_1.default.warn(`No game state found for room ${roomId} during chat send. Relaying message.`);
                    const message = {
                        senderId: client.userId,
                        senderName: client.username,
                        text,
                        timestamp: Date.now(),
                        isSystem: false,
                    };
                    this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, message);
                    return callback === null || callback === void 0 ? void 0 : callback({ success: true });
                }
                const { currentState, currentDrawerId, currentWord } = currentGameState;
                const gamePhase = currentState; // Castear a GamePhase importado
                const isDrawingOrGuessingPhase = gamePhase === GameState_model_1.GameState.DRAWING || gamePhase === GameState_model_1.GameState.GUESSING;
                const senderIsDrawer = client.userId === (currentDrawerId === null || currentDrawerId === void 0 ? void 0 : currentDrawerId.toString());
                // Si es el dibujante durante la fase de dibujo/adivinanza, no permitir chat
                if (isDrawingOrGuessingPhase && senderIsDrawer) {
                    logger_1.default.info(`User ${client.username} (drawer) tried to chat during active phase. Message blocked: ${text}`);
                    // Notificar solo al dibujante
                    socket.emit(SocketEvent.USER_NOTIFICATION, {
                        type: 'warning',
                        message: 'No puedes enviar mensajes mientras dibujas o esperan tu dibujo.',
                    });
                    return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Los dibujantes no pueden chatear durante la ronda.' });
                }
                // Si es fase de adivinanza, no es el dibujante, y hay palabra actual
                if (gamePhase === GameState_model_1.GameState.GUESSING && !senderIsDrawer && currentWord) {
                    const guessNormalized = text.trim().toLowerCase();
                    const wordNormalized = currentWord.trim().toLowerCase();
                    if (guessNormalized === wordNormalized) {
                        // Adivinanza correcta: procesar a través de la máquina de estados
                        logger_1.default.info(`${client.username} guessed correctly in room ${roomId}. Word: ${currentWord}`);
                        try {
                            yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.SUBMIT_GUESS, { guess: text, username: client.username }, // payload para SUBMIT_GUESS
                            client.userId);
                            // La máquina de estados se encargará de notificar puntajes y transiciones
                            // No enviar el mensaje original al chat para no revelar la palabra
                            return callback === null || callback === void 0 ? void 0 : callback({ success: true, correctGuess: true });
                        }
                        catch (gameError) {
                            logger_1.default.error(`Error processing correct guess for ${client.username} in room ${roomId}:`, gameError);
                            // Notificar al usuario que hubo un problema procesando su adivinanza correcta
                            socket.emit(SocketEvent.USER_NOTIFICATION, {
                                type: 'error',
                                message: `Hubo un problema al procesar tu adivinanza: ${gameError.message}`,
                            });
                            return callback === null || callback === void 0 ? void 0 : callback({ success: false, error: 'Error procesando adivinanza.' });
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
                callback === null || callback === void 0 ? void 0 : callback({ success: true, correctGuess: false });
            }
            catch (error) {
                logger_1.default.error('Error sending chat message:', error);
                callback === null || callback === void 0 ? void 0 : callback({ success: false, error: error.message || 'Error interno del servidor.' });
            }
        }));
    }
    // Configurar eventos relacionados con usuarios
    setupUserEvents(socket) {
        // Estado de actividad
        socket.on(SocketEvent.USER_ACTIVITY, (data) => {
            const { status } = data;
            const client = this.clients.get(socket.id);
            if (!client || !client.roomId)
                return;
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
        socket.on(SocketEvent.USER_TYPING, (data) => {
            const { isTyping } = data;
            const client = this.clients.get(socket.id);
            if (!client || !client.roomId)
                return;
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
    addClientToRoom(socket, client, roomId) {
        var _a;
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
        (_a = this.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.add(socket.id);
        logger_1.default.info(`Client ${socket.id} (${client.username}) joined room ${roomId}`);
    }
    // Manejar salida de un cliente de una sala
    handleClientLeaveRoom(socket, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const client = this.clients.get(socket.id);
            if (!client)
                return;
            // Quitar socket de la sala
            socket.leave(roomId);
            // Actualizar referencia del cliente
            client.roomId = undefined;
            this.clients.set(socket.id, client);
            // Actualizar mapa de salas
            (_a = this.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.delete(socket.id);
            // Si la sala queda vacía, eliminarla
            if (((_b = this.rooms.get(roomId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
                this.rooms.delete(roomId);
                // Eliminar estado de la sala
                this.roomStates.delete(roomId);
            }
            else {
                try {
                    // Obtener datos actualizados de la sala desde la base de datos
                    const playersData = yield models_1.GamePlayerModel.find({
                        roomId: new mongoose_1.Types.ObjectId(roomId),
                        status: { $ne: 'left' }, // Excluir jugadores que han abandonado
                    }).lean();
                    const formattedPlayers = playersData.map((player) => ({
                        userId: player.userId.toString(),
                        username: player.username,
                        isReady: player.isReady || false,
                        role: player.role || 'player',
                        avatarColor: player.avatarColor || '#3b82f6',
                    }));
                    // Notificar a otros en la sala con datos actualizados desde la BD
                    socket.to(roomId).emit(SocketEvent.ROOM_PLAYER_LEFT, {
                        playerId: client.userId,
                        playerName: client.username,
                        room: {
                            id: roomId,
                            players: formattedPlayers,
                        },
                    });
                }
                catch (error) {
                    logger_1.default.error(`Error obteniendo datos actualizados de la sala ${roomId} después de salida:`, error);
                    // Enviar notificación con datos de memoria como fallback
                    socket.to(roomId).emit(SocketEvent.ROOM_PLAYER_LEFT, {
                        playerId: client.userId,
                        playerName: client.username,
                        // Información básica sin detalles completos
                        room: { id: roomId },
                    });
                }
            }
            logger_1.default.info(`Client ${socket.id} (${client.username}) left room ${roomId}`);
        });
    }
    // Obtener clientes en una sala
    getClientsInRoom(roomId) {
        return this.rooms.get(roomId) || new Set();
    }
    // Enviar mensaje de sistema a una sala
    sendSystemMessage(roomId, text) {
        if (!this.io)
            return;
        this.io.to(roomId).emit(SocketEvent.CHAT_MESSAGE, {
            senderId: 'system',
            senderName: 'Sistema',
            text,
            timestamp: Date.now(),
            isSystem: true,
        });
    }
    // Enviar notificación a un usuario específico
    sendUserNotification(socketId, type, message) {
        var _a, _b;
        // Si es un ID de usuario en lugar de socket
        if (socketId.length < 20) {
            // Heurística simple para diferenciar IDs de usuario vs socket
            // Buscar todos los sockets conectados del usuario
            let found = false;
            for (const [sid, client] of this.clients.entries()) {
                if (client.userId === socketId && client.isConnected) {
                    const socket = (_a = this.io) === null || _a === void 0 ? void 0 : _a.sockets.sockets.get(sid);
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
        const socket = (_b = this.io) === null || _b === void 0 ? void 0 : _b.sockets.sockets.get(socketId);
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
    queueMessageForUser(userId, event, data) {
        var _a;
        if (!this.messageQueue.has(userId)) {
            this.messageQueue.set(userId, []);
        }
        (_a = this.messageQueue.get(userId)) === null || _a === void 0 ? void 0 : _a.push({
            event,
            data,
            timestamp: Date.now(),
        });
        logger_1.default.info(`Message queued for disconnected user ${userId}: ${event}`);
    }
    // Enviar notificación a todos los usuarios en una sala
    sendRoomNotification(roomId, type, message) {
        if (!this.io)
            return;
        this.io.to(roomId).emit(SocketEvent.USER_NOTIFICATION, { type, message });
    }
    // Actualizar y almacenar estado de una sala
    updateRoomState(roomId, state) {
        // Guardar el estado más reciente
        this.roomStates.set(roomId, Object.assign(Object.assign({}, state), { timestamp: Date.now() }));
        logger_1.default.debug(`Room state updated for ${roomId}`);
    }
    // Obtener instancia del servidor Socket.io
    getIO() {
        return this.io;
    }
    // Notificar a todos los usuarios de una sala que el juego ha comenzado
    notifyGameStarted(roomId, gameRoom) {
        var _a;
        if (!this.io)
            return;
        // Emitir evento de inicio de juego a todos en la sala
        this.io.to(roomId).emit(SocketEvent.ROOM_GAME_STARTED, {
            roomId,
            gameId: (_a = gameRoom.currentGame) === null || _a === void 0 ? void 0 : _a.id,
            startedAt: new Date(),
        });
        // También enviar una notificación
        this.sendRoomNotification(roomId, 'success', '¡El juego ha comenzado!');
        logger_1.default.info(`Game started notification sent to room ${roomId}`);
    }
}
exports.default = new SocketService();
