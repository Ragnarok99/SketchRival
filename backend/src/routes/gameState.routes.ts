import express from 'express';
import * as gameStateController from '../controllers/gameState.controller';
import { protectRoute } from '../middleware/auth.middleware';

const router = express.Router();

// Rutas para la gestión del estado del juego con middleware de autenticación
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.get('/:roomId', protectRoute, gameStateController.getGameState);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/start', protectRoute, gameStateController.startGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/word', protectRoute, gameStateController.selectWord);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/drawing', protectRoute, gameStateController.submitDrawing);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/guess', protectRoute, gameStateController.submitGuess);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/next-round', protectRoute, gameStateController.nextRound);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/end', protectRoute, gameStateController.endGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/reset', protectRoute, gameStateController.resetGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/timer-end', protectRoute, gameStateController.timerEnd);

export default router;
