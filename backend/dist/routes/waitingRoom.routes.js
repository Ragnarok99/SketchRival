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
const waitingRoomController = __importStar(require("../controllers/waitingRoom.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const gameRooms_validation_1 = require("../middleware/validation-rules/gameRooms.validation");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const waitingRoom_validation_1 = require("../middleware/validation-rules/waitingRoom.validation");
const router = (0, express_1.Router)();
// POST /rooms/:id/ready - Establecer estado "listo" de un jugador
router.post('/:id/ready', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, waitingRoom_validation_1.readyStatusValidationRules)(), gameRooms_validation_1.validate, waitingRoomController.setReady);
// POST /rooms/:id/kick - Expulsar a un jugador (solo anfitrión)
router.post('/:id/kick', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, waitingRoom_validation_1.kickPlayerValidationRules)(), gameRooms_validation_1.validate, waitingRoomController.kickPlayer);
// POST /rooms/:id/start - Iniciar el juego (solo anfitrión)
router.post('/:id/start', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, waitingRoom_validation_1.startGameValidationRules)(), gameRooms_validation_1.validate, waitingRoomController.startGame);
// GET /rooms/:id/ready-status - Obtener estado de "listos" de la sala
router.get('/:id/ready-status', auth_middleware_1.protect, (0, waitingRoom_validation_1.startGameValidationRules)(), gameRooms_validation_1.validate, waitingRoomController.getRoomReadyStatus);
exports.default = router;
