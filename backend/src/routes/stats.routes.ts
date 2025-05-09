import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { statsLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// GET /stats/player/:userId - Obtener estadísticas de un jugador específico
router.get('/player/:userId', statsLimiter, statsController.getPlayerStats);

// GET /stats/me - Obtener estadísticas del jugador actual (requiere autenticación)
router.get('/me', protect, statsLimiter, statsController.getCurrentPlayerStats);

// GET /stats/rankings - Obtener ranking de jugadores
router.get('/rankings', statsLimiter, statsController.getPlayerRankings);

// GET /stats/achievements/:userId - Obtener logros de un jugador específico
router.get('/achievements/:userId', statsLimiter, statsController.getPlayerAchievements);

// GET /stats/achievements/me - Obtener logros del jugador actual (requiere autenticación)
router.get('/achievements/me', protect, statsLimiter, statsController.getCurrentPlayerAchievements);

export default router;
