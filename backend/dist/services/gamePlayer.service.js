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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlayerToRoom = exports.changePlayerRole = exports.getRoomReadyStatus = exports.removePlayerFromRoom = exports.updatePlayerStatus = exports.findPlayerInRoom = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const GamePlayer_model_1 = require("../models/GamePlayer.model");
/**
 * Buscar un jugador en una sala específica
 */
const findPlayerInRoom = (userId, roomId) => __awaiter(void 0, void 0, void 0, function* () {
    return models_1.GamePlayerModel.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        roomId: new mongoose_1.Types.ObjectId(roomId),
    });
});
exports.findPlayerInRoom = findPlayerInRoom;
/**
 * Actualizar el estado de un jugador (listo/no listo)
 */
const updatePlayerStatus = (userId, roomId, isReady) => __awaiter(void 0, void 0, void 0, function* () {
    return models_1.GamePlayerModel.findOneAndUpdate({
        userId: new mongoose_1.Types.ObjectId(userId),
        roomId: new mongoose_1.Types.ObjectId(roomId),
    }, { isReady }, { new: true });
});
exports.updatePlayerStatus = updatePlayerStatus;
/**
 * Eliminar un jugador de una sala
 */
const removePlayerFromRoom = (playerId, roomId) => __awaiter(void 0, void 0, void 0, function* () {
    return models_1.GamePlayerModel.findOneAndUpdate({
        userId: new mongoose_1.Types.ObjectId(playerId),
        roomId: new mongoose_1.Types.ObjectId(roomId),
    }, {
        status: GamePlayer_model_1.PlayerStatus.DISCONNECTED,
        isReady: false,
    }, { new: true });
});
exports.removePlayerFromRoom = removePlayerFromRoom;
/**
 * Obtener el estado de "listos" de todos los jugadores en una sala
 */
const getRoomReadyStatus = (roomId) => __awaiter(void 0, void 0, void 0, function* () {
    // Buscar todos los jugadores activos en la sala
    const players = yield models_1.GamePlayerModel.find({
        roomId: new mongoose_1.Types.ObjectId(roomId),
        status: { $in: [GamePlayer_model_1.PlayerStatus.WAITING, GamePlayer_model_1.PlayerStatus.READY] },
    });
    // Contar jugadores totales y listos
    const playerCount = players.length;
    const readyCount = players.filter((player) => player.isReady).length;
    const allReady = playerCount > 0 && playerCount === readyCount;
    // Mínimo 2 jugadores para comenzar
    const canStart = playerCount >= 2 && allReady;
    return {
        playerCount,
        readyCount,
        allReady,
        canStart,
    };
});
exports.getRoomReadyStatus = getRoomReadyStatus;
/**
 * Cambiar el rol de un jugador en una sala
 */
const changePlayerRole = (userId, roomId, role) => __awaiter(void 0, void 0, void 0, function* () {
    return models_1.GamePlayerModel.findOneAndUpdate({
        userId: new mongoose_1.Types.ObjectId(userId),
        roomId: new mongoose_1.Types.ObjectId(roomId),
    }, { role }, { new: true });
});
exports.changePlayerRole = changePlayerRole;
/**
 * Añadir un jugador a una sala
 */
const addPlayerToRoom = (userId_1, roomId_1, ...args_1) => __awaiter(void 0, [userId_1, roomId_1, ...args_1], void 0, function* (userId, roomId, role = GamePlayer_model_1.PlayerRole.PLAYER) {
    // Verificar si el jugador ya está en la sala
    const existingPlayer = yield (0, exports.findPlayerInRoom)(userId, roomId);
    if (existingPlayer) {
        // Si ya existe pero había salido, reactivarlo
        if (existingPlayer.status === GamePlayer_model_1.PlayerStatus.DISCONNECTED) {
            return models_1.GamePlayerModel.findOneAndUpdate({
                userId: new mongoose_1.Types.ObjectId(userId),
                roomId: new mongoose_1.Types.ObjectId(roomId),
            }, {
                status: GamePlayer_model_1.PlayerStatus.WAITING,
                isReady: false,
            }, { new: true });
        }
        // Si ya está activo, devolver el jugador existente
        return existingPlayer;
    }
    // Crear nuevo jugador en la sala
    const newPlayer = new models_1.GamePlayerModel({
        userId: new mongoose_1.Types.ObjectId(userId),
        roomId: new mongoose_1.Types.ObjectId(roomId),
        role,
        status: GamePlayer_model_1.PlayerStatus.WAITING,
        isReady: false,
        joinedAt: new Date(),
    });
    return newPlayer.save();
});
exports.addPlayerToRoom = addPlayerToRoom;
// Exportar como objeto por defecto para mantener consistencia con el controlador
exports.default = {
    findPlayerInRoom: exports.findPlayerInRoom,
    updatePlayerStatus: exports.updatePlayerStatus,
    removePlayerFromRoom: exports.removePlayerFromRoom,
    getRoomReadyStatus: exports.getRoomReadyStatus,
    changePlayerRole: exports.changePlayerRole,
    addPlayerToRoom: exports.addPlayerToRoom,
};
