"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaderboard_controller_1 = __importDefault(require("../controllers/leaderboard.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware"); // Opcional, si algunas rutas de leaderboard son protegidas
const router = (0, express_1.Router)();
// Obtener una tabla de líderes (público)
// Ejemplo: GET /api/leaderboard?category=global&limit=10&page=1
router.get('/', leaderboard_controller_1.default.getLeaderboard);
// Obtener el rango del jugador autenticado (protegido)
// Ejemplo: GET /api/leaderboard/my-rank?category=global
router.get('/my-rank', auth_middleware_1.protectRoute, leaderboard_controller_1.default.getPlayerRank);
// Obtener el rango de un jugador específico por ID (público)
// Ejemplo: GET /api/leaderboard/rank/:userId?category=global
router.get('/rank/:userId', leaderboard_controller_1.default.getPlayerRank);
exports.default = router;
