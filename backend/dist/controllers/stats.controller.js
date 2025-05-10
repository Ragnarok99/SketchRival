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
exports.getCurrentPlayerAchievements = exports.getPlayerAchievements = exports.getPlayerRankings = exports.getCurrentPlayerStats = exports.getPlayerStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const gameRoomsService = __importStar(require("../services/gameRooms.service"));
// Obtener estadísticas de un jugador específico
const getPlayerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }
        const playerStats = yield models_1.GameStatsModel.findOne({ userId });
        if (!playerStats) {
            return res.status(404).json({ message: 'Estadísticas no encontradas para este usuario' });
        }
        return res.status(200).json({
            stats: playerStats,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener estadísticas' });
    }
});
exports.getPlayerStats = getPlayerStats;
// Obtener estadísticas del jugador autenticado
const getCurrentPlayerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        const playerStats = yield models_1.GameStatsModel.findOne({ userId });
        if (!playerStats) {
            // Si no existe, crear estadísticas vacías
            const newStats = new models_1.GameStatsModel({
                userId,
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                drawingsCreated: 0,
                correctlyGuessedDrawings: 0,
                totalGuesses: 0,
                correctGuesses: 0,
                fastestGuessTime: 0,
                averageGuessTime: 0,
                totalPlayTime: 0,
                longestSession: 0,
                wordsCategoriesPlayed: [],
                friendsPlayed: 0,
                achievementsUnlocked: 0,
                rankPoints: 0,
            });
            yield newStats.save();
            return res.status(200).json({
                stats: newStats,
            });
        }
        // Obtener también el ranking actual del jugador
        const currentRank = yield models_1.GameStatsModel.getUserRanking(userId);
        return res.status(200).json({
            stats: playerStats,
            currentRank,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener estadísticas' });
    }
});
exports.getCurrentPlayerStats = getCurrentPlayerStats;
// Obtener ranking de jugadores
const getPlayerRankings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const sortBy = req.query.sortBy ||
            'rankPoints';
        const rankings = yield gameRoomsService.getPlayerRankings(limit, sortBy);
        return res.status(200).json({
            rankings,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener rankings' });
    }
});
exports.getPlayerRankings = getPlayerRankings;
// Obtener logros de un jugador específico
const getPlayerAchievements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }
        // Obtener logros desbloqueados por el usuario
        const userAchievements = yield models_1.UserRewardModel.find({ userId }).sort({ unlockedAt: -1 }).lean();
        if (!userAchievements || userAchievements.length === 0) {
            return res.status(200).json({
                achievements: [],
                message: 'Este usuario aún no ha desbloqueado ningún logro',
            });
        }
        // Obtener detalles de las recompensas
        const rewardIds = userAchievements.map((ua) => ua.rewardId);
        const rewardDetails = yield models_1.GameRewardModel.find({ _id: { $in: rewardIds } }).lean();
        // Combinar los datos
        const achievements = userAchievements.map((ua) => {
            const details = rewardDetails.find((rd) => rd._id.toString() === ua.rewardId.toString());
            return Object.assign(Object.assign({}, ua), { details });
        });
        return res.status(200).json({
            achievements,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener logros' });
    }
});
exports.getPlayerAchievements = getPlayerAchievements;
// Obtener logros del jugador autenticado
const getCurrentPlayerAchievements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        // Obtener logros desbloqueados por el usuario
        const userAchievements = yield models_1.UserRewardModel.find({ userId }).sort({ unlockedAt: -1 }).lean();
        if (!userAchievements || userAchievements.length === 0) {
            return res.status(200).json({
                achievements: [],
                message: 'Aún no has desbloqueado ningún logro',
            });
        }
        // Obtener detalles de las recompensas
        const rewardIds = userAchievements.map((ua) => ua.rewardId);
        const rewardDetails = yield models_1.GameRewardModel.find({ _id: { $in: rewardIds } }).lean();
        // Combinar los datos
        const achievements = userAchievements.map((ua) => {
            const details = rewardDetails.find((rd) => rd._id.toString() === ua.rewardId.toString());
            return Object.assign(Object.assign({}, ua), { details });
        });
        // Marcar como vistos (no nuevos)
        yield models_1.UserRewardModel.updateMany({ userId, isNew: true }, { $set: { isNew: false } });
        return res.status(200).json({
            achievements,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener logros' });
    }
});
exports.getCurrentPlayerAchievements = getCurrentPlayerAchievements;
