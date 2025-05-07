import { Router } from 'express';
import * as waitingRoomController from '../controllers/waitingRoom.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation-rules/gameRooms.validation';
import { roomActionLimiter } from '../middleware/rate-limit.middleware';
import {
  readyStatusValidationRules,
  kickPlayerValidationRules,
  startGameValidationRules,
} from '../middleware/validation-rules/waitingRoom.validation';

const router = Router();

// POST /rooms/:id/ready - Establecer estado "listo" de un jugador
router.post(
  '/:id/ready',
  protect,
  roomActionLimiter,
  readyStatusValidationRules(),
  validate,
  waitingRoomController.setReady,
);

// POST /rooms/:id/kick - Expulsar a un jugador (solo anfitrión)
router.post(
  '/:id/kick',
  protect,
  roomActionLimiter,
  kickPlayerValidationRules(),
  validate,
  waitingRoomController.kickPlayer,
);

// POST /rooms/:id/start - Iniciar el juego (solo anfitrión)
router.post(
  '/:id/start',
  protect,
  roomActionLimiter,
  startGameValidationRules(),
  validate,
  waitingRoomController.startGame,
);

// GET /rooms/:id/ready-status - Obtener estado de "listos" de la sala
router.get(
  '/:id/ready-status',
  protect,
  startGameValidationRules(),
  validate,
  waitingRoomController.getRoomReadyStatus,
);

export default router;
