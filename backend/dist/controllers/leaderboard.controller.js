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
const leaderboardService_1 = __importDefault(require("../services/leaderboardService"));
class LeaderboardController {
    getLeaderboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const category = req.query.category || 'global';
                const limit = parseInt(req.query.limit) || 20;
                const page = parseInt(req.query.page) || 1;
                if (limit <= 0 || page <= 0) {
                    return res.status(400).json({ success: false, message: 'Limit y page deben ser números positivos.' });
                }
                const leaderboardData = yield leaderboardService_1.default.getLeaderboard(category, limit, page);
                return res.status(200).json({ success: true, data: leaderboardData });
            }
            catch (error) {
                console.error('Error al obtener leaderboard:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor al obtener leaderboard.';
                return res.status(500).json({ success: false, message });
            }
        });
    }
    getPlayerRank(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Usar IRequestWithUser si se obtiene del token
            try {
                const userId = req.params.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId); // Tomar de params o del usuario autenticado
                const category = req.query.category || 'global';
                if (!userId) {
                    return res.status(400).json({ success: false, message: 'UserID no especificado o usuario no autenticado.' });
                }
                const rankData = yield leaderboardService_1.default.getPlayerRank(userId, category);
                if (!rankData || rankData.rank === null) {
                    return res.status(404).json({ success: false, message: 'Jugador no encontrado en el leaderboard.' });
                }
                return res.status(200).json({ success: true, data: rankData });
            }
            catch (error) {
                console.error('Error al obtener el rango del jugador:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor al obtener el rango.';
                return res.status(500).json({ success: false, message });
            }
        });
    }
}
exports.default = new LeaderboardController();
