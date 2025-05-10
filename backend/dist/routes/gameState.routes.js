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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gameStateController = __importStar(require("../controllers/gameState.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Rutas para la gestión del estado del juego con middleware de autenticación
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.get('/:roomId', auth_middleware_1.protectRoute, gameStateController.getGameState);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/start', auth_middleware_1.protectRoute, gameStateController.startGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/word', auth_middleware_1.protectRoute, gameStateController.selectWord);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/drawing', auth_middleware_1.protectRoute, gameStateController.submitDrawing);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/guess', auth_middleware_1.protectRoute, gameStateController.submitGuess);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/next-round', auth_middleware_1.protectRoute, gameStateController.nextRound);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/end', auth_middleware_1.protectRoute, gameStateController.endGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/reset', auth_middleware_1.protectRoute, gameStateController.resetGame);
// @ts-expect-error - Suprimimos errores de tipo temporalmente
router.post('/:roomId/timer-end', auth_middleware_1.protectRoute, gameStateController.timerEnd);
exports.default = router;
