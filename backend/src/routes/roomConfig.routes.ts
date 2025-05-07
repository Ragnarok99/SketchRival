import { Router } from 'express';
import * as roomConfigController from '../controllers/roomConfig.controller';
import { protect } from '../middleware/auth.middleware';
import { roomsLimiter, roomActionLimiter } from '../middleware/rate-limit.middleware';
import {
  createRoomWithConfigValidationRules,
  updateRoomConfigValidationRules,
  roomIdValidationRules,
  validate,
} from '../middleware/validation-rules/roomConfig.validation';

const router = Router();

// GET /configs - Obtener todas las configuraciones disponibles
router.get('/', roomsLimiter, roomConfigController.getAvailableConfigs);

// GET /configs/presets/:preset - Obtener una configuración preestablecida
router.get('/presets/:preset', roomsLimiter, roomConfigController.getConfigPreset);

// POST /configs/validate - Validar una configuración sin guardarla
router.post('/validate', roomsLimiter, roomConfigController.validateConfig);

// POST /configs/rooms - Crear una sala con configuración específica
router.post(
  '/rooms',
  protect,
  roomActionLimiter,
  createRoomWithConfigValidationRules(),
  validate,
  roomConfigController.createRoomWithConfig,
);

// PUT /configs/rooms/:id - Actualizar la configuración de una sala existente
router.put(
  '/rooms/:id',
  protect,
  roomActionLimiter,
  roomIdValidationRules(),
  updateRoomConfigValidationRules(),
  validate,
  roomConfigController.updateRoomConfig,
);

export default router;
