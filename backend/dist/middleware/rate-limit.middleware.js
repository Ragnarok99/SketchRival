"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordsLimiter = exports.statsLimiter = exports.gameStateLimiter = exports.configLimiter = exports.waitingRoomLimiter = exports.roomActionLimiter = exports.roomsLimiter = exports.resetPasswordLimiter = exports.forgotPasswordLimiter = exports.registerLimiter = exports.loginLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Configuración base para todos los limitadores
const baseConfig = {
    standardHeaders: true, // Devolver info rate limit en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilitar los headers `X-RateLimit-*`
    message: {
        message: 'Demasiadas solicitudes, por favor intenta más tarde.',
    },
};
// Limitar solicitudes de autenticación (login, registro, etc.)
exports.authLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 15 * 60 * 1000, max: 50, message: {
        message: 'Demasiados intentos de autenticación, por favor intenta más tarde.',
    } }));
// Limitadores específicos para operaciones de autenticación
exports.loginLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 15 * 60 * 1000, max: 5, message: {
        message: 'Demasiados intentos de inicio de sesión, por favor intenta más tarde.',
    } }));
exports.registerLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 60 * 60 * 1000, max: 3, message: {
        message: 'Demasiados intentos de registro, por favor intenta más tarde.',
    } }));
exports.forgotPasswordLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 60 * 60 * 1000, max: 3, message: {
        message: 'Demasiadas solicitudes de recuperación de contraseña, por favor intenta más tarde.',
    } }));
exports.resetPasswordLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 60 * 60 * 1000, max: 3, message: {
        message: 'Demasiados intentos de reseteo de contraseña, por favor intenta más tarde.',
    } }));
// Limitar solicitudes para creación de salas
exports.roomsLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 10 * 60 * 1000, max: 100 }));
// Limitar acciones en salas específicas
exports.roomActionLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 5 * 60 * 1000, max: 200 }));
// Limitar solicitudes de sala de espera
exports.waitingRoomLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 5 * 60 * 1000, max: 200 }));
// Limitar solicitudes de configuración de salas
exports.configLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 10 * 60 * 1000, max: 100 }));
// Limitar solicitudes de estado de juego
exports.gameStateLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 5 * 60 * 1000, max: 300 }));
// Limitar solicitudes de estadísticas
exports.statsLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 5 * 60 * 1000, max: 100 }));
// Limitar solicitudes de palabras
exports.wordsLimiter = (0, express_rate_limit_1.default)(Object.assign(Object.assign({}, baseConfig), { windowMs: 5 * 60 * 1000, max: 100 }));
