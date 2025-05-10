import { Router } from 'express';
import seasonController from '../controllers/season.controller';
import { protectRoute, adminOnly } from '../middleware/auth.middleware'; // Suponiendo que adminOnly es un middleware que verifica roles

const router = Router();

// Rutas públicas para ver información de temporadas
router.get('/active', seasonController.getActiveSeasons);
router.get('/', seasonController.getAllSeasons); // Podría ser /all o similar
router.get('/:id', seasonController.getSeasonById);
router.get('/:id/leaderboard', seasonController.getSeasonLeaderboard);

// Rutas protegidas para administración de temporadas (solo admins)
router.post('/', protectRoute, adminOnly, seasonController.createSeason);
router.put('/:id', protectRoute, adminOnly, seasonController.updateSeason);

// Rutas para jobs (podrían tener una capa de seguridad diferente, ej. clave secreta de job)
router.post('/run/activate-due', protectRoute, adminOnly, seasonController.runActivateDueSeasons);
router.post('/run/conclude-ended', protectRoute, adminOnly, seasonController.runConcludeEndedSeasons);

export default router;
