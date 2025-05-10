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
const roomConfigController = __importStar(require("../controllers/roomConfig.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const roomConfig_validation_1 = require("../middleware/validation-rules/roomConfig.validation");
const router = (0, express_1.Router)();
// GET /configs - Obtener todas las configuraciones disponibles
router.get('/', rate_limit_middleware_1.roomsLimiter, roomConfigController.getAvailableConfigs);
// GET /configs/presets/:preset - Obtener una configuración preestablecida
router.get('/presets/:preset', rate_limit_middleware_1.roomsLimiter, roomConfigController.getConfigPreset);
// POST /configs/validate - Validar una configuración sin guardarla
router.post('/validate', rate_limit_middleware_1.roomsLimiter, roomConfigController.validateConfig);
// POST /configs/rooms - Crear una sala con configuración específica
router.post('/rooms', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, roomConfig_validation_1.createRoomWithConfigValidationRules)(), roomConfig_validation_1.validate, roomConfigController.createRoomWithConfig);
// PUT /configs/rooms/:id - Actualizar la configuración de una sala existente
router.put('/rooms/:id', auth_middleware_1.protect, rate_limit_middleware_1.roomActionLimiter, (0, roomConfig_validation_1.roomIdValidationRules)(), (0, roomConfig_validation_1.updateRoomConfigValidationRules)(), roomConfig_validation_1.validate, roomConfigController.updateRoomConfig);
exports.default = router;
