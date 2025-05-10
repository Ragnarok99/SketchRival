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
exports.getRoomReadyStatus = exports.startGame = exports.kickPlayer = exports.setReady = void 0;
const gameRoom_service_1 = __importDefault(require("../services/gameRoom.service"));
const gamePlayer_service_1 = __importDefault(require("../services/gamePlayer.service"));
const socket_service_1 = __importDefault(require("../services/socket.service"));
/**
 * Establecer estado "listo" de un jugador
 */
const setReady = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { roomId } = req.params;
        const { ready } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Verificar si el jugador existe en la sala
        const player = yield gamePlayer_service_1.default.findPlayerInRoom(userId, roomId);
        if (!player) {
            return res.status(404).json({ message: 'Jugador no encontrado en esta sala' });
        }
        // Actualizar estado
        yield gamePlayer_service_1.default.updatePlayerStatus(userId, roomId, ready);
        // Obtener sala actualizada
        const room = yield gameRoom_service_1.default.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        // Notificar a todos en la sala usando socket
        (_b = socket_service_1.default.getIO()) === null || _b === void 0 ? void 0 : _b.to(roomId).emit('room:playerReady', {
            playerId: userId,
            isReady: ready,
            room,
        });
        return res.status(200).json({
            success: true,
            player: Object.assign(Object.assign({}, player), { isReady: ready }),
        });
    }
    catch (error) {
        console.error('Error al establecer estado listo:', error);
        return res.status(500).json({ message: 'Error al establecer estado' });
    }
});
exports.setReady = setReady;
/**
 * Expulsar a un jugador de la sala
 */
const kickPlayer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { roomId } = req.params;
        const { playerId } = req.body;
        const hostId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!hostId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Verificar si el usuario es el anfitrión
        const room = yield gameRoom_service_1.default.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        if (room.hostId !== hostId) {
            return res.status(403).json({ message: 'Solo el anfitrión puede expulsar jugadores' });
        }
        // Eliminar al jugador de la sala
        yield gamePlayer_service_1.default.removePlayerFromRoom(playerId, roomId);
        // Obtener sala actualizada
        const updatedRoom = yield gameRoom_service_1.default.getRoomById(roomId);
        // Notificar a todos en la sala usando socket
        (_b = socket_service_1.default.getIO()) === null || _b === void 0 ? void 0 : _b.to(roomId).emit('room:playerLeft', {
            playerId,
            room: updatedRoom,
        });
        // Enviar notificación al jugador expulsado
        socket_service_1.default.sendUserNotification(playerId, 'warning', `Has sido expulsado de la sala: ${room.name}`);
        return res.status(200).json({
            success: true,
            room: updatedRoom,
        });
    }
    catch (error) {
        console.error('Error al expulsar jugador:', error);
        return res.status(500).json({ message: 'Error al expulsar jugador' });
    }
});
exports.kickPlayer = kickPlayer;
/**
 * Iniciar el juego
 */
const startGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const hostId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!hostId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Verificar si el usuario es el anfitrión
        const room = yield gameRoom_service_1.default.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        if (room.hostId !== hostId) {
            return res.status(403).json({ message: 'Solo el anfitrión puede iniciar el juego' });
        }
        // Verificar si todos los jugadores están listos
        const readyStatus = yield gamePlayer_service_1.default.getRoomReadyStatus(roomId);
        if (!readyStatus.allReady || readyStatus.playerCount < 2) {
            return res.status(400).json({
                message: 'No se puede iniciar el juego. Todos los jugadores deben estar listos y debe haber al menos 2 jugadores.',
            });
        }
        // Cambiar estado de la sala y crear juego
        const gameRoom = yield gameRoom_service_1.default.startGame(roomId);
        // Notificar a todos en la sala usando socket
        socket_service_1.default.notifyGameStarted(roomId, gameRoom);
        return res.status(200).json({
            success: true,
            game: gameRoom.currentGame,
        });
    }
    catch (error) {
        console.error('Error al iniciar juego:', error);
        return res.status(500).json({ message: 'Error al iniciar el juego' });
    }
});
exports.startGame = startGame;
/**
 * Obtener estado "listo" de todos los jugadores en una sala
 */
const getRoomReadyStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        // Obtener estadísticas de "listos"
        const readyStatus = yield gamePlayer_service_1.default.getRoomReadyStatus(roomId);
        return res.status(200).json({ readyStatus });
    }
    catch (error) {
        console.error('Error al obtener estado de listos:', error);
        return res.status(500).json({ message: 'Error al obtener estado de la sala' });
    }
});
exports.getRoomReadyStatus = getRoomReadyStatus;
