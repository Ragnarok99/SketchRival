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

// NUEVOS ENDPOINTS PARA SISTEMA PÚBLICO/PRIVADO

// POST /rooms/:id/validate-code - Validar código de acceso sin unirse
router.post(
  '/:id/validate-code',
  roomActionLimiter,
  roomIdValidationRules(),
  joinRoomValidationRules(),
  validate,
  gameRoomsController.validateAccessCode,
);

// GET /rooms/code/:code - Buscar sala por código de acceso
router.get('/code/:code', roomsLimiter, gameRoomsController.findRoomByCode);

// PUT /rooms/:id/type - Cambiar tipo de sala (pública/privada)
router.put(
  '/:id/type',
  protect,
  roomActionLimiter,
  roomIdValidationRules(),
  validate,
  gameRoomsController.changeRoomType,
);

// POST /rooms/:id/regenerate-code - Regenerar código de acceso para salas privadas
router.post(
  '/:id/regenerate-code',
  protect,
  roomActionLimiter,
  roomIdValidationRules(),
  validate,
  gameRoomsController.regenerateAccessCode,
);

export default router;
