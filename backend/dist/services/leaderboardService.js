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
const Leaderboard_model_1 = __importDefault(require("../models/Leaderboard.model"));
class LeaderboardService {
    /**
     * Actualiza la puntuación de un jugador en una categoría del leaderboard.
     * Solo actualiza si la nueva puntuación es mayor o si no existe entrada.
     * @param userId ID del usuario.
     * @param username Nombre del usuario (cacheado).
     * @param newScore Nueva puntuación del jugador.
     * @param level Nivel actual del jugador (opcional).
     * @param category Categoría del leaderboard (ej. 'global').
     */
    updatePlayerScore(userId_1, username_1, newScore_1, level_1) {
        return __awaiter(this, arguments, void 0, function* (userId, username, newScore, level, category = 'global') {
            try {
                const existingEntry = yield Leaderboard_model_1.default.findOne({
                    userId,
                    category,
                });
                if (existingEntry && newScore <= existingEntry.score) {
                    // Si la nueva puntuación no es mejor, no hacer nada o solo actualizar lastGamePlayedAt
                    existingEntry.lastGamePlayedAt = new Date();
                    return yield existingEntry.save();
                }
                const updatedEntry = yield Leaderboard_model_1.default.findOneAndUpdate({ userId, category }, {
                    $set: {
                        username,
                        score: newScore,
                        level,
                        lastGamePlayedAt: new Date(),
                    },
                }, { new: true, upsert: true, setDefaultsOnInsert: true });
                return updatedEntry;
            }
            catch (error) {
                console.error(`Error al actualizar la puntuación en el leaderboard para el usuario ${userId} en categoría ${category}:`, error);
                throw error; // O manejar de forma más específica
            }
        });
    }
    /**
     * Obtiene una tabla de líderes paginada para una categoría específica.
     * @param category Categoría del leaderboard.
     * @param limit Número de entradas por página.
     * @param page Número de página (1-indexed).
     * @returns Un objeto con las entradas y el total de entradas.
     */
    getLeaderboard() {
        return __awaiter(this, arguments, void 0, function* (category = 'global', limit = 20, // Un límite más razonable por defecto
        page = 1) {
            try {
                const skip = (page - 1) * limit;
                const query = { category };
                const entries = yield Leaderboard_model_1.default.find(query)
                    .sort({ score: -1, lastGamePlayedAt: 1 }) // Ordenar por puntuación, luego por actividad más reciente
                    .skip(skip)
                    .limit(limit)
                    .lean(); // .lean() para objetos JS planos y más rápidos
                const totalEntries = yield Leaderboard_model_1.default.countDocuments(query);
                const totalPages = Math.ceil(totalEntries / limit);
                // Asignar rango dinámicamente basado en la posición en la consulta paginada
                const rankedEntries = entries.map((entry, index) => (Object.assign(Object.assign({}, entry), { rank: skip + index + 1 })));
                return {
                    entries: rankedEntries, // castear después de añadir rank
                    totalEntries,
                    currentPage: page,
                    totalPages,
                };
            }
            catch (error) {
                console.error(`Error al obtener el leaderboard para la categoría ${category}:`, error);
                throw error;
            }
        });
    }
    /**
     * Obtiene el rango y la puntuación de un jugador específico en una categoría.
     * @param userId ID del usuario.
     * @param category Categoría del leaderboard.
     * @returns Un objeto con el rango y la puntuación, o null si no se encuentra.
     */
    getPlayerRank(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, category = 'global') {
            try {
                const playerEntry = yield Leaderboard_model_1.default.findOne({ userId, category }).lean();
                if (!playerEntry) {
                    return { rank: null, score: null, entry: null };
                }
                // Contar cuántos jugadores tienen una puntuación mayor (o igual y jugaron después)
                const higherRankCount = yield Leaderboard_model_1.default.countDocuments({
                    category,
                    $or: [
                        { score: { $gt: playerEntry.score } },
                        {
                            score: playerEntry.score,
                            lastGamePlayedAt: { $lt: playerEntry.lastGamePlayedAt }, // Jugadores más recientes con mismo score van primero
                        },
                    ],
                });
                return {
                    rank: higherRankCount + 1,
                    score: playerEntry.score,
                    entry: playerEntry,
                };
            }
            catch (error) {
                console.error(`Error al obtener el rango para el usuario ${userId} en categoría ${category}:`, error);
                throw error;
            }
        });
    }
}
const leaderboardService = new LeaderboardService();
exports.default = leaderboardService;
