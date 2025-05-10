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
const Season_model_1 = __importDefault(require("../models/Season.model"));
const leaderboardService_1 = __importDefault(require("./leaderboardService")); // Para obtener ganadores
class SeasonService {
    createSeason(seasonData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validar que leaderboardCategoryKey no esté ya en uso por otra temporada si es necesario
                // o manejarlo a nivel de schema unique index
                const season = new Season_model_1.default(seasonData);
                yield season.save();
                return season;
            }
            catch (error) {
                console.error('Error al crear la temporada:', error);
                throw error;
            }
        });
    }
    getActiveSeasons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Season_model_1.default.find({
                    isActive: true,
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() },
                }).sort({ endDate: 1 });
            }
            catch (error) {
                console.error('Error al obtener temporadas activas:', error);
                throw error;
            }
        });
    }
    getAllSeasons() {
        return __awaiter(this, arguments, void 0, function* (includePast = true) {
            try {
                const query = includePast ? {} : { endDate: { $gte: new Date() } };
                return yield Season_model_1.default.find(query).sort({ startDate: -1 });
            }
            catch (error) {
                console.error('Error al obtener todas las temporadas:', error);
                throw error;
            }
        });
    }
    getSeasonById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Season_model_1.default.findById(id);
            }
            catch (error) {
                console.error(`Error al obtener la temporada ${id}:`, error);
                throw error;
            }
        });
    }
    updateSeason(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Season_model_1.default.findByIdAndUpdate(id, updateData, { new: true });
            }
            catch (error) {
                console.error(`Error al actualizar la temporada ${id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Intenta activar temporadas cuya fecha de inicio ha llegado y aún no están activas.
     * Podría ser llamado por un job programado.
     */
    activateDueSeasons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                yield Season_model_1.default.updateMany({ isActive: false, startDate: { $lte: now }, endDate: { $gte: now } }, { $set: { isActive: true } });
                console.log('Temporadas debidas activadas.');
            }
            catch (error) {
                console.error('Error activando temporadas debidas:', error);
            }
        });
    }
    /**
     * Finaliza temporadas cuya fecha de finalización ha pasado y aún están activas.
     * Calcula ganadores y potencialmente otorga recompensas.
     * Podría ser llamado por un job programado.
     */
    concludeEndedSeasons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const seasonsToConclude = yield Season_model_1.default.find({
                    isActive: true,
                    endDate: { $lt: now },
                });
                for (const season of seasonsToConclude) {
                    season.isActive = false;
                    // Lógica para calcular ganadores y otorgar recompensas
                    if (season.rewards && season.rewards.length > 0) {
                        const leaderboard = yield leaderboardService_1.default.getLeaderboard(season.leaderboardCategoryKey, 100); // Obtener top 100 por ejemplo
                        console.log(`Procesando recompensas para la temporada: ${season.name}`);
                        for (const rewardTier of season.rewards) {
                            const winnersInTier = leaderboard.entries.filter((entry) => entry.rank && entry.rank >= rewardTier.rankMin && entry.rank <= rewardTier.rankMax);
                            for (const winner of winnersInTier) {
                                console.log(`Jugador ${winner.username} (ID: ${winner.userId}) ganó: ${rewardTier.description}`);
                                // Aquí iría la lógica para otorgar la recompensa real (ej. añadir item a inventario, dar monedas virtuales)
                                // Esto dependería de otros sistemas (inventario, moneda virtual) que no están definidos aún.
                            }
                        }
                    }
                    yield season.save();
                    console.log(`Temporada ${season.name} finalizada.`);
                }
            }
            catch (error) {
                console.error('Error finalizando temporadas:', error);
            }
        });
    }
}
const seasonService = new SeasonService();
exports.default = seasonService;
