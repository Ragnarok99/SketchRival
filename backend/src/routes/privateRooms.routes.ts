import { Router } from 'express';
import * as privateRoomsController from '../controllers/privateRooms.controller';
import { protect } from '../middleware/auth.middleware';
import { roomsLimiter, roomActionLimiter } from '../middleware/rate-limit.middleware';
import { roomIdValidationRules, validate } from '../middleware/validation-rules/gameRooms.validation';

const router = Router();

// GET /private/rooms - Obtener salas privadas del usuario
router.get('/rooms', protect, roomsLimiter, privateRoomsController.getUserPrivateRooms);

// GET /private/rooms/:id/invitations - Listar invitaciones de una sala
router.get(
  '/rooms/:id/invitations',
  protect,
  roomIdValidationRules(),
  validate,
  roomsLimiter,
  privateRoomsController.listInvitations,
);

// POST /private/rooms/:id/regenerate-code - Regenerar código de acceso
router.post(
  '/rooms/:id/regenerate-code',
  protect,
  roomIdValidationRules(),
  validate,
  roomActionLimiter,
  privateRoomsController.regenerateAccessCode,
);

// POST /private/rooms/:id/visibility - Cambiar visibilidad (pública/privada)
router.post(
  '/rooms/:id/visibility',
  protect,
  roomIdValidationRules(),
  validate,
  roomActionLimiter,
  privateRoomsController.toggleRoomVisibility,
);

// POST /private/rooms/:id/invite - Crear invitación para la sala
router.post(
  '/rooms/:id/invite',
  protect,
  roomIdValidationRules(),
  validate,
  roomActionLimiter,
  privateRoomsController.createInvitation,
);

// POST /private/invitations/accept - Aceptar invitación
router.post('/invitations/accept', protect, roomActionLimiter, privateRoomsController.acceptInvitation);

// GET /private/access/:code - Buscar sala por código de acceso
router.get('/access/:code', roomsLimiter, privateRoomsController.findRoomByCode);

export default router;
