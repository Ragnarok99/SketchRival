"use strict";
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
    SocketEvent["GAME_END"] = "game:end";
    SocketEvent["GAME_TURN"] = "game:turn";
    SocketEvent["GAME_SUBMIT"] = "game:submit";
    SocketEvent["GAME_VOTE"] = "game:vote";
    // Eventos de usuario
    SocketEvent["USER_STATUS"] = "user:status";
    SocketEvent["USER_ACTIVITY"] = "user:activity";
    SocketEvent["USER_TYPING"] = "user:typing";
    SocketEvent["USER_NOTIFICATION"] = "user:notification";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
// Servicio principal de Socket.io
class SocketService {
    constructor() {
        this.io = null;
        this.clients = new Map();
        this.rooms = new Map(); // roomId -> Set of socketIds
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
        logger_1.default.info(`Socket connected: ${socket.id} (User: ${username}, ID: ${userId})`);
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
    handleDisconnect(socket) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
        logger_1.default.info(`Socket disconnected: ${socket.id} (User: ${client.username})`);
        // Si el cliente estaba en una sala, notificar a otros
        if (client.roomId) {
            this.handleClientLeaveRoom(socket, client.roomId);
        }
        // Eliminar cliente
        this.clients.delete(socket.id);
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
            }
            catch (error) {
                logger_1.default.error('Error joining room:', error);
                callback('Error joining room');
            }
        }));
        // Abandonar una sala
        socket.on(SocketEvent.ROOM_LEAVE, (data, callback) => {
            try {
                const { roomId } = data;
                if (!roomId)
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                this.handleClientLeaveRoom(socket, roomId);
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error leaving room:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error leaving room');
            }
        });
        // Marcar como listo/no listo
        socket.on(SocketEvent.ROOM_SET_READY, (data, callback) => {
            var _a;
            try {
                const { roomId, isReady } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                }
                // TODO: Actualizar estado en base de datos
                // Notificar a todos en la sala
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(roomId).emit(SocketEvent.ROOM_PLAYER_READY, {
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
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error setting ready status:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error setting ready status');
            }
        });
        // Iniciar juego (solo anfitrión)
        socket.on(SocketEvent.GAME_START, (data, callback) => {
            var _a;
            try {
                const { roomId } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId) {
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request');
                }
                // TODO: Verificar si el cliente es anfitrión y todos están listos
                // Notificar a todos que el juego comenzó
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(roomId).emit(SocketEvent.ROOM_GAME_STARTED, {
                    roomId,
                    startedById: client.userId,
                });
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error starting game:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error starting game');
            }
        });
    }
    // Configurar eventos relacionados con chat
    setupChatEvents(socket) {
        socket.on(SocketEvent.CHAT_SEND, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId, text } = data;
                const client = this.clients.get(socket.id);
                if (!client || !roomId || !text || !this.io) {
                    return callback === null || callback === void 0 ? void 0 : callback('Invalid request or service not ready');
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
                const currentState = DEBUG_MOCK_GAME_STATE; // Forzar tipo para el ejemplo
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
                        return callback === null || callback === void 0 ? void 0 : callback(); // Termina aquí, no retransmite la palabra correcta al chat
                    }
                }
                // Si es el dibujante durante la fase de adivinanza/dibujo, no permitir chat (o filtrar)
                if (isGuessingPhase && senderIsDrawer) {
                    // Opcional: enviar un mensaje de error/aviso solo al dibujante
                    // socket.emit('user:notification', { type: 'error', message: 'No puedes chatear mientras dibujas.'});
                    console.log(`User ${client.username} (drawer) tried to chat during drawing/guessing phase. Message blocked: ${text}`);
                    return callback === null || callback === void 0 ? void 0 : callback('Los dibujantes no pueden chatear durante la ronda de dibujo.');
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
                callback === null || callback === void 0 ? void 0 : callback();
            }
            catch (error) {
                logger_1.default.error('Error sending chat message:', error);
                callback === null || callback === void 0 ? void 0 : callback('Error sending chat message');
            }
        }));
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
    }
    // Configurar eventos relacionados con usuarios
    setupUserEvents(socket) {
        // Estado de actividad
        socket.on(SocketEvent.USER_ACTIVITY, (data) => {
            const { status } = data;
            const client = this.clients.get(socket.id);
            if (!client || !client.roomId)
                return;
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
        }
        else {
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
        logger_1.default.info(`Client ${socket.id} (${client.username}) left room ${roomId}`);
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
        var _a;
        const socket = (_a = this.io) === null || _a === void 0 ? void 0 : _a.sockets.sockets.get(socketId);
        if (!socket)
            return;
        socket.emit(SocketEvent.USER_NOTIFICATION, { type, message });
    }
    // Enviar notificación a todos los usuarios en una sala
    sendRoomNotification(roomId, type, message) {
        if (!this.io)
            return;
        this.io.to(roomId).emit(SocketEvent.USER_NOTIFICATION, { type, message });
    }
    // Obtener instancia del servidor Socket.io
    getIO() {
        return this.io;
    }
}
exports.default = new SocketService();
