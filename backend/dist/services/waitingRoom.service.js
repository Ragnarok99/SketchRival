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
exports.setPlayerReady = setPlayerReady;
exports.kickPlayer = kickPlayer;
exports.startGame = startGame;
exports.getRoomReadyStatus = getRoomReadyStatus;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const GamePlayer_model_1 = require("../models/GamePlayer.model");
const GameRoom_model_1 = require("../models/GameRoom.model");
/**
 * Establece el estado de "listo" de un jugador en una sala
 * @param roomId ID de la sala
 * @param userId ID del usuario
 * @param isReady Estado de listo (true/false)
 * @returns El jugador actualizado
 */
function setPlayerReady(roomId, userId, isReady) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Verificar que la sala existe y está en estado de espera
            const room = yield models_1.GameRoomModel.findById(roomId);
            if (!room) {
                throw new Error('Sala no encontrada');
            }
            if (room.status !== GameRoom_model_1.GameRoomStatus.WAITING) {
                throw new Error('La sala no está en estado de espera');
            }
            // Buscar y actualizar el estado del jugador
            const player = yield models_1.GamePlayerModel.findOneAndUpdate({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                userId: new mongoose_1.Types.ObjectId(userId),
            }, {
                isReady,
                status: isReady ? GamePlayer_model_1.PlayerStatus.READY : GamePlayer_model_1.PlayerStatus.WAITING,
                lastActivity: new Date(),
            }, { new: true });
            if (!player) {
                throw new Error('Jugador no encontrado en esta sala');
            }
            // Crear mensaje de sistema sobre el cambio de estado
            yield models_1.GameMessageModel.createSystemMessage(new mongoose_1.Types.ObjectId(roomId), `${player.username} ${isReady ? 'está listo' : 'ya no está listo'}`);
            // Comprobar si todos los jugadores están listos y hay al menos 2 jugadores
            yield checkAllPlayersReady(roomId);
            return player;
        }
        catch (error) {
            console.error(`Error al cambiar estado de listo para usuario ${userId} en sala ${roomId}:`, error);
            throw error;
        }
    });
}
/**
 * Expulsa a un jugador de una sala (solo para el anfitrión)
 * @param roomId ID de la sala
 * @param hostId ID del anfitrión que solicita la expulsión
 * @param playerToKickId ID del jugador a expulsar
 * @returns La sala actualizada
 */
function kickPlayer(roomId, hostId, playerToKickId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Verificar que la sala existe
            const room = yield models_1.GameRoomModel.findById(roomId);
            if (!room) {
                throw new Error('Sala no encontrada');
            }
            // Verificar que el solicitante es el anfitrión
            const host = yield models_1.GamePlayerModel.findOne({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                userId: new mongoose_1.Types.ObjectId(hostId),
                role: GamePlayer_model_1.PlayerRole.HOST,
            });
            if (!host) {
                throw new Error('Solo el anfitrión puede expulsar jugadores');
            }
            // Buscar el jugador a expulsar
            const playerToKick = yield models_1.GamePlayerModel.findOne({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                userId: new mongoose_1.Types.ObjectId(playerToKickId),
            });
            if (!playerToKick) {
                throw new Error('Jugador no encontrado en esta sala');
            }
            if (playerToKick.role === GamePlayer_model_1.PlayerRole.HOST) {
                throw new Error('No puedes expulsar al anfitrión');
            }
            // Guardar el nombre del jugador antes de eliminarlo
            const kickedPlayerName = playerToKick.username;
            // Eliminar al jugador de la sala
            yield models_1.GamePlayerModel.deleteOne({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                userId: new mongoose_1.Types.ObjectId(playerToKickId),
            });
            // Eliminar referencia del jugador en la sala
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                $pull: { players: playerToKick._id },
            });
            // Crear mensaje de sistema sobre la expulsión
            yield models_1.GameMessageModel.createSystemMessage(new mongoose_1.Types.ObjectId(roomId), `${kickedPlayerName} ha sido expulsado de la sala`);
            // Devolver la sala actualizada
            return yield models_1.GameRoomModel.findById(roomId).populate({
                path: 'players',
                select: 'userId username role status score isConnected isReady avatarColor',
            });
        }
        catch (error) {
            console.error(`Error al expulsar al jugador ${playerToKickId} por ${hostId} en sala ${roomId}:`, error);
            throw error;
        }
    });
}
/**
 * Inicia el juego (solo para el anfitrión)
 * @param roomId ID de la sala
 * @param hostId ID del anfitrión
 * @returns La sala con el estado actualizado
 */
function startGame(roomId, hostId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Verificar que la sala existe
            const room = yield models_1.GameRoomModel.findById(roomId);
            if (!room) {
                throw new Error('Sala no encontrada');
            }
            // Verificar que el solicitante es el anfitrión
            const host = yield models_1.GamePlayerModel.findOne({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                userId: new mongoose_1.Types.ObjectId(hostId),
                role: GamePlayer_model_1.PlayerRole.HOST,
            });
            if (!host) {
                throw new Error('Solo el anfitrión puede iniciar el juego');
            }
            // Verificar que hay al menos 2 jugadores
            const playerCount = yield models_1.GamePlayerModel.countDocuments({
                roomId: new mongoose_1.Types.ObjectId(roomId),
            });
            if (playerCount < 2) {
                throw new Error('Se necesitan al menos 2 jugadores para iniciar el juego');
            }
            // Verificar que todos los jugadores estén listos (excepto el anfitrión)
            const notReadyPlayers = yield models_1.GamePlayerModel.find({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                role: { $ne: GamePlayer_model_1.PlayerRole.HOST },
                isReady: false,
            });
            if (notReadyPlayers.length > 0) {
                throw new Error('No todos los jugadores están listos');
            }
            // Actualizar estado de la sala
            const updatedRoom = yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: GameRoom_model_1.GameRoomStatus.PLAYING,
                startedAt: new Date(),
            }, { new: true }).populate({
                path: 'players',
                select: 'userId username role status score isConnected isReady avatarColor',
            });
            // Actualizar estado de todos los jugadores
            yield models_1.GamePlayerModel.updateMany({ roomId: new mongoose_1.Types.ObjectId(roomId) }, { status: GamePlayer_model_1.PlayerStatus.PLAYING });
            // Crear mensaje de sistema sobre el inicio del juego
            yield models_1.GameMessageModel.createSystemMessage(new mongoose_1.Types.ObjectId(roomId), 'El juego ha comenzado');
            return updatedRoom;
        }
        catch (error) {
            console.error(`Error al iniciar juego por ${hostId} en sala ${roomId}:`, error);
            throw error;
        }
    });
}
/**
 * Verifica si todos los jugadores están listos y actualiza el estado de la sala
 * @param roomId ID de la sala
 * @returns true si todos están listos, false en caso contrario
 */
function checkAllPlayersReady(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Contar jugadores totales (excluyendo al anfitrión)
        const playerCount = yield models_1.GamePlayerModel.countDocuments({
            roomId: new mongoose_1.Types.ObjectId(roomId),
            role: { $ne: GamePlayer_model_1.PlayerRole.HOST },
        });
        // Si no hay otros jugadores además del anfitrión, no es necesario verificar
        if (playerCount === 0) {
            return false;
        }
        // Contar jugadores listos (excluyendo al anfitrión)
        const readyCount = yield models_1.GamePlayerModel.countDocuments({
            roomId: new mongoose_1.Types.ObjectId(roomId),
            role: { $ne: GamePlayer_model_1.PlayerRole.HOST },
            isReady: true,
        });
        // Verificar si todos están listos
        return readyCount === playerCount;
    });
}
/**
 * Obtiene el estado de "todos listos" de una sala
 * @param roomId ID de la sala
 * @returns Objeto con información de readiness
 */
function getRoomReadyStatus(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Verificar que la sala existe
            const room = yield models_1.GameRoomModel.findById(roomId);
            if (!room) {
                throw new Error('Sala no encontrada');
            }
            // Contar jugadores totales (excluyendo al anfitrión)
            const playerCount = yield models_1.GamePlayerModel.countDocuments({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                role: { $ne: GamePlayer_model_1.PlayerRole.HOST },
            });
            // Contar jugadores listos (excluyendo al anfitrión)
            const readyCount = yield models_1.GamePlayerModel.countDocuments({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                role: { $ne: GamePlayer_model_1.PlayerRole.HOST },
                isReady: true,
            });
            // Obtener total de jugadores (incluyendo anfitrión)
            const totalPlayers = yield models_1.GamePlayerModel.countDocuments({
                roomId: new mongoose_1.Types.ObjectId(roomId),
            });
            return {
                allReady: playerCount > 0 && readyCount === playerCount,
                readyCount,
                playerCount,
                totalPlayers,
                canStart: playerCount > 0 && readyCount === playerCount && totalPlayers >= 2,
            };
        }
        catch (error) {
            console.error(`Error al obtener estado de preparación de sala ${roomId}:`, error);
            throw error;
        }
    });
}
