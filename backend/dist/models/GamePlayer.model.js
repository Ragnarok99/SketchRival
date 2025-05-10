"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePlayerModel = exports.PlayerStatus = exports.PlayerRole = void 0;
const mongoose_1 = require("mongoose");
// Enum para el rol del jugador en la sala
var PlayerRole;
(function (PlayerRole) {
    PlayerRole["HOST"] = "host";
    PlayerRole["PLAYER"] = "player";
    PlayerRole["SPECTATOR"] = "spectator";
})(PlayerRole || (exports.PlayerRole = PlayerRole = {}));
// Enum para el estado del jugador
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["WAITING"] = "waiting";
    PlayerStatus["READY"] = "ready";
    PlayerStatus["PLAYING"] = "playing";
    PlayerStatus["FINISHED"] = "finished";
    PlayerStatus["DISCONNECTED"] = "disconnected";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
// Esquema para el jugador
const GamePlayerSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'GameRoom',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(PlayerRole),
        default: PlayerRole.PLAYER,
    },
    status: {
        type: String,
        enum: Object.values(PlayerStatus),
        default: PlayerStatus.WAITING,
    },
    score: {
        type: Number,
        default: 0,
    },
    isConnected: {
        type: Boolean,
        default: true,
    },
    isReady: {
        type: Boolean,
        default: false,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
    avatarColor: {
        type: String,
        default: function () {
            // Generar un color aleatorio para el avatar
            const colors = [
                '#FF5733',
                '#33FF57',
                '#3357FF',
                '#F3FF33',
                '#FF33F3',
                '#33FFF3',
                '#FF8033',
                '#8033FF',
                '#33FF80',
                '#FF3380',
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        },
    },
}, {
    timestamps: true,
});
// Índices para búsquedas eficientes
GamePlayerSchema.index({ roomId: 1, userId: 1 }, { unique: true }); // Índice compuesto único (un usuario solo puede estar una vez en cada sala)
GamePlayerSchema.index({ roomId: 1, score: -1 }); // Para buscar jugadores por puntuación en una sala
GamePlayerSchema.index({ userId: 1 }); // Para buscar todas las salas de un usuario
GamePlayerSchema.index({ lastActivity: 1 }); // Para identificar jugadores inactivos
// Crear y exportar el modelo
exports.GamePlayerModel = (0, mongoose_1.model)('GamePlayer', GamePlayerSchema);
