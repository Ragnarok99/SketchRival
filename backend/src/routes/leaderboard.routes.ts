import { Router } from 'express';
import leaderboardController from '../controllers/leaderboard.controller';
import { protectRoute } from '../middleware/auth.middleware'; // Opcional, si algunas rutas de leaderboard son protegidas

const router = Router();

// Obtener una tabla de líderes (público)
// Ejemplo: GET /api/leaderboard?category=global&limit=10&page=1
router.get('/', leaderboardController.getLeaderboard);

// Obtener el rango del jugador autenticado (protegido)
// Ejemplo: GET /api/leaderboard/my-rank?category=global
router.get('/my-rank', protectRoute, leaderboardController.getPlayerRank);

// Obtener el rango de un jugador específico por ID (público)
// Ejemplo: GET /api/leaderboard/rank/:userId?category=global
router.get('/rank/:userId', leaderboardController.getPlayerRank);

export default router;
