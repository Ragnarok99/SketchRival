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
const seasonService_1 = __importDefault(require("../services/seasonService"));
const leaderboardService_1 = __importDefault(require("../services/leaderboardService"));
class SeasonController {
    createSeason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newSeason = yield seasonService_1.default.createSeason(req.body);
                return res.status(201).json({ success: true, data: newSeason });
            }
            catch (error) {
                console.error('Error al crear temporada:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor.';
                return res.status(500).json({ success: false, message });
            }
        });
    }
    getActiveSeasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activeSeasons = yield seasonService_1.default.getActiveSeasons();
                return res.status(200).json({ success: true, data: activeSeasons });
            }
            catch (error) {
                console.error('Error al obtener temporadas activas:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            }
        });
    }
    getAllSeasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const includePast = req.query.includePast !== 'false'; // Default to true
                const allSeasons = yield seasonService_1.default.getAllSeasons(includePast);
                return res.status(200).json({ success: true, data: allSeasons });
            }
            catch (error) {
                console.error('Error al obtener todas las temporadas:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            }
        });
    }
    getSeasonById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const season = yield seasonService_1.default.getSeasonById(req.params.id);
                if (!season) {
                    return res.status(404).json({ success: false, message: 'Temporada no encontrada.' });
                }
                return res.status(200).json({ success: true, data: season });
            }
            catch (error) {
                console.error('Error al obtener temporada por ID:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            }
        });
    }
    updateSeason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedSeason = yield seasonService_1.default.updateSeason(req.params.id, req.body);
                if (!updatedSeason) {
                    return res.status(404).json({ success: false, message: 'Temporada no encontrada para actualizar.' });
                }
                return res.status(200).json({ success: true, data: updatedSeason });
            }
            catch (error) {
                console.error('Error al actualizar temporada:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor.';
                return res.status(500).json({ success: false, message });
            }
        });
    }
    getSeasonLeaderboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const seasonId = req.params.id;
                const limit = parseInt(req.query.limit) || 20;
                const page = parseInt(req.query.page) || 1;
                const season = yield seasonService_1.default.getSeasonById(seasonId);
                if (!season) {
                    return res.status(404).json({ success: false, message: 'Temporada no encontrada.' });
                }
                const leaderboardData = yield leaderboardService_1.default.getLeaderboard(season.leaderboardCategoryKey, limit, page);
                return res.status(200).json({ success: true, data: leaderboardData });
            }
            catch (error) {
                console.error('Error al obtener leaderboard de la temporada:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor.';
                return res.status(500).json({ success: false, message });
            }
        });
    }
    // Endpoints para ejecutar manualmente la activación/conclusión (para admins o jobs)
    runActivateDueSeasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield seasonService_1.default.activateDueSeasons();
                return res.status(200).json({ success: true, message: 'Proceso de activación de temporadas ejecutado.' });
            }
            catch (error) {
                return res.status(500).json({ success: false, message: 'Error ejecutando activación de temporadas.' });
            }
        });
    }
    runConcludeEndedSeasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield seasonService_1.default.concludeEndedSeasons();
                return res.status(200).json({ success: true, message: 'Proceso de conclusión de temporadas ejecutado.' });
            }
            catch (error) {
                return res.status(500).json({ success: false, message: 'Error ejecutando conclusión de temporadas.' });
            }
        });
    }
}
exports.default = new SeasonController();
