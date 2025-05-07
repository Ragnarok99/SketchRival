import { Router } from 'express';
import * as gameRoomsController from '../controllers/gameRooms.controller';
import { protect } from '../middleware/auth.middleware';
import {
  createRoomValidationRules,
  updateRoomValidationRules,
  roomIdValidationRules,
  joinRoomValidationRules,
  validate,
} from '../middleware/validation-rules/gameRooms.validation';
import { roomsLimiter, roomActionLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// POST /rooms - Crear una nueva sala
router.post('/', protect, roomsLimiter, createRoomValidationRules(), validate, gameRoomsController.createRoom);

// GET /rooms - Listar salas públicas (con filtros opcionales)
router.get('/', roomsLimiter, gameRoomsController.listRooms);

// GET /rooms/:id - Obtener detalles de una sala específica
router.get('/:id', roomsLimiter, roomIdValidationRules(), validate, gameRoomsController.getRoomDetails);

// PUT /rooms/:id - Actualizar configuración de una sala
router.put(
  '/:id',
  protect,
  roomActionLimiter,
  roomIdValidationRules(),
  updateRoomValidationRules(),
  validate,
  gameRoomsController.updateRoom,
);

// POST /rooms/:id/join - Unirse a una sala
router.post(
  '/:id/join',
  protect,
  roomActionLimiter,
  roomIdValidationRules(),
  joinRoomValidationRules(),
  validate,
  gameRoomsController.joinRoom,
);

// POST /rooms/:id/leave - Abandonar una sala
router.post('/:id/leave', protect, roomActionLimiter, roomIdValidationRules(), validate, gameRoomsController.leaveRoom);

// DELETE /rooms/:id - Cerrar/eliminar una sala
router.delete('/:id', protect, roomActionLimiter, roomIdValidationRules(), validate, gameRoomsController.closeRoom);

export default router;
