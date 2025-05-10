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
exports.GameStatsModel = void 0;
const mongoose_1 = require("mongoose");
/**
 * Esquema de MongoDB para estadísticas de juego
 */
const GameStatsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Un documento de estadísticas por usuario
    },
    // Estadísticas básicas
    gamesPlayed: {
        type: Number,
        default: 0,
    },
    gamesWon: {
        type: Number,
        default: 0,
    },
    totalScore: {
        type: Number,
        default: 0,
    },
    // Estadísticas de dibujo
    drawingsCreated: {
        type: Number,
        default: 0,
    },
    correctlyGuessedDrawings: {
        type: Number,
        default: 0,
    },
    drawingAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    // Estadísticas de adivinanzas
    totalGuesses: {
        type: Number,
        default: 0,
    },
    correctGuesses: {
        type: Number,
        default: 0,
    },
    guessAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    fastestGuessTime: {
        type: Number,
        default: 0,
    },
    averageGuessTime: {
        type: Number,
        default: 0,
    },
    // Estadísticas de tiempo
    totalPlayTime: {
        type: Number,
        default: 0,
    },
    longestSession: {
        type: Number,
        default: 0,
    },
    // Estadísticas de palabras
    wordsCategoriesPlayed: {
        type: [String],
        default: [],
    },
    favoriteCategory: {
        type: String,
    },
    // Estadísticas sociales
    friendsPlayed: {
        type: Number,
        default: 0,
    },
    // Logros
    achievementsUnlocked: {
        type: Number,
        default: 0,
    },
    // Ranking
    highestRank: {
        type: Number,
    },
    currentRank: {
        type: Number,
    },
    rankPoints: {
        type: Number,
        default: 0,
    },
    // Fechas de seguimiento
    lastPlayed: {
        type: Date,
    },
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
// Índices para consultas eficientes
GameStatsSchema.index({ userId: 1 }, { unique: true });
GameStatsSchema.index({ totalScore: -1 }); // Para ranking global por puntuación
GameStatsSchema.index({ rankPoints: -1 }); // Para ranking global por puntos de ranking
GameStatsSchema.index({ gamesPlayed: -1 }); // Para ranking por cantidad de juegos
GameStatsSchema.index({ gamesWon: -1 }); // Para ranking por victorias
GameStatsSchema.index({ drawingAccuracy: -1 }); // Para ranking por precisión de dibujo
GameStatsSchema.index({ guessAccuracy: -1 }); // Para ranking por precisión de adivinanzas
GameStatsSchema.index({ lastPlayed: -1 }); // Para filtrar por actividad reciente
/**
 * Método para actualizar la precisión de dibujo al guardar
 */
GameStatsSchema.pre('save', function (next) {
    // Calcular precisión de dibujo
    if (this.drawingsCreated > 0) {
        this.drawingAccuracy = Math.round((this.correctlyGuessedDrawings / this.drawingsCreated) * 100);
    }
    // Calcular precisión de adivinanzas
    if (this.totalGuesses > 0) {
        this.guessAccuracy = Math.round((this.correctGuesses / this.totalGuesses) * 100);
    }
    // Actualizar última jugada si no está establecida
    if (!this.lastPlayed) {
        this.lastPlayed = new Date();
    }
    next();
});
// Método estático para obtener el ranking de un usuario
GameStatsSchema.statics.getUserRanking = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Obtener posición del usuario en el ranking general
        const userStats = yield this.findOne({ userId });
        if (!userStats)
            return null;
        // Contar usuarios con más puntaje
        const aheadCount = yield this.countDocuments({
            rankPoints: { $gt: userStats.rankPoints },
        });
        // La posición es el conteo + 1
        return aheadCount + 1;
    });
};
// Exportar el modelo
exports.GameStatsModel = (0, mongoose_1.model)('GameStats', GameStatsSchema);
