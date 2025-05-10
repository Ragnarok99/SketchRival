"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const season_controller_1 = __importDefault(require("../controllers/season.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware"); // Suponiendo que adminOnly es un middleware que verifica roles
const router = (0, express_1.Router)();
// Rutas públicas para ver información de temporadas
router.get('/active', season_controller_1.default.getActiveSeasons);
router.get('/', season_controller_1.default.getAllSeasons); // Podría ser /all o similar
router.get('/:id', season_controller_1.default.getSeasonById);
router.get('/:id/leaderboard', season_controller_1.default.getSeasonLeaderboard);
// Rutas protegidas para administración de temporadas (solo admins)
router.post('/', auth_middleware_1.protectRoute, auth_middleware_1.adminOnly, season_controller_1.default.createSeason);
router.put('/:id', auth_middleware_1.protectRoute, auth_middleware_1.adminOnly, season_controller_1.default.updateSeason);
// Rutas para jobs (podrían tener una capa de seguridad diferente, ej. clave secreta de job)
router.post('/run/activate-due', auth_middleware_1.protectRoute, auth_middleware_1.adminOnly, season_controller_1.default.runActivateDueSeasons);
router.post('/run/conclude-ended', auth_middleware_1.protectRoute, auth_middleware_1.adminOnly, season_controller_1.default.runConcludeEndedSeasons);
exports.default = router;
