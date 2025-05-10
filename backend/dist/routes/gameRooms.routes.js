"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gameRoomsController = __importStar(require("../controllers/gameRooms.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const gameRooms_validation_1 = require("../middleware/validation-rules/gameRooms.validation");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const router = (0, express_1.Router)();
// POST /rooms - Crear una nueva sala
router.post('/', auth_middleware_1.protect, rate_limit_middleware_1.roomsLimiter, (0, gameRooms_validation_1.createRoomValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.createRoom);
// GET /rooms - Listar salas públicas (con filtros opcionales)
router.get('/', rate_limit_middleware_1.roomsLimiter, gameRoomsController.listRooms);
// GET /rooms/:id - Obtener detalles de una sala específica
router.get('/:id', rate_limit_middleware_1.roomsLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.getRoomDetails);
// PUT /rooms/:id - Actualizar configuración de una sala
router.put('/:id', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), (0, gameRooms_validation_1.updateRoomValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.updateRoom);
// POST /rooms/:id/join - Unirse a una sala
router.post('/:id/join', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), (0, gameRooms_validation_1.joinRoomValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.joinRoom);
// POST /rooms/:id/leave - Abandonar una sala
router.post('/:id/leave', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.leaveRoom);
// DELETE /rooms/:id - Cerrar/eliminar una sala
router.delete('/:id', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.closeRoom);
// NUEVOS ENDPOINTS PARA SISTEMA PÚBLICO/PRIVADO
// POST /rooms/:id/validate-code - Validar código de acceso sin unirse
router.post('/:id/validate-code', rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), (0, gameRooms_validation_1.joinRoomValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.validateAccessCode);
// GET /rooms/code/:code - Buscar sala por código de acceso
router.get('/code/:code', rate_limit_middleware_1.roomsLimiter, gameRoomsController.findRoomByCode);
// PUT /rooms/:id/type - Cambiar tipo de sala (pública/privada)
router.put('/:id/type', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.changeRoomType);
// POST /rooms/:id/regenerate-code - Regenerar código de acceso para salas privadas
router.post('/:id/regenerate-code', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, gameRoomsController.regenerateAccessCode);
exports.default = router;
