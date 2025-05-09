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
const privateRoomsController = __importStar(require("../controllers/privateRooms.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const gameRooms_validation_1 = require("../middleware/validation-rules/gameRooms.validation");
const router = (0, express_1.Router)();
// GET /private/rooms - Obtener salas privadas del usuario
router.get('/rooms', auth_middleware_1.protect, rate_limit_middleware_1.roomsLimiter, privateRoomsController.getUserPrivateRooms);
// GET /private/rooms/:id/invitations - Listar invitaciones de una sala
router.get('/rooms/:id/invitations', auth_middleware_1.protect, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, rate_limit_middleware_1.roomsLimiter, privateRoomsController.listInvitations);
// POST /private/rooms/:id/regenerate-code - Regenerar código de acceso
router.post('/rooms/:id/regenerate-code', auth_middleware_1.protect, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, rate_limit_middleware_1.roomActionLimiter, privateRoomsController.regenerateAccessCode);
// POST /private/rooms/:id/visibility - Cambiar visibilidad (pública/privada)
router.post('/rooms/:id/visibility', auth_middleware_1.protect, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, rate_limit_middleware_1.roomActionLimiter, privateRoomsController.toggleRoomVisibility);
// POST /private/rooms/:id/invite - Crear invitación para la sala
router.post('/rooms/:id/invite', auth_middleware_1.protect, (0, gameRooms_validation_1.roomIdValidationRules)(), gameRooms_validation_1.validate, rate_limit_middleware_1.roomActionLimiter, privateRoomsController.createInvitation);
// POST /private/invitations/accept - Aceptar invitación
router.post('/invitations/accept', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, privateRoomsController.acceptInvitation);
// GET /private/access/:code - Buscar sala por código de acceso
router.get('/access/:code', rate_limit_middleware_1.roomsLimiter, privateRoomsController.findRoomByCode);
exports.default = router;
