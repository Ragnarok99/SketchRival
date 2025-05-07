import express from 'express';
import * as gameStateController from '../controllers/gameState.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(protect);

// Rutas para la gestión del estado del juego
router.get('/:roomId', gameStateController.getGameState);
router.post('/:roomId/start', gameStateController.startGame);
router.post('/:roomId/word', gameStateController.selectWord);
router.post('/:roomId/drawing', gameStateController.submitDrawing);
router.post('/:roomId/guess', gameStateController.submitGuess);
router.post('/:roomId/next-round', gameStateController.nextRound);
router.post('/:roomId/end', gameStateController.endGame);
router.post('/:roomId/reset', gameStateController.resetGame);
router.post('/:roomId/timer-end', gameStateController.timerEnd);

export default router;
