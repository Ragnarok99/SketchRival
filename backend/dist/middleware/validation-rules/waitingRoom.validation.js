"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGameValidationRules = exports.kickPlayerValidationRules = exports.readyStatusValidationRules = void 0;
const express_validator_1 = require("express-validator");
const gameRooms_validation_1 = require("./gameRooms.validation");
/**
 * Reglas de validación para establecer el estado de "listo"
 */
const readyStatusValidationRules = () => {
    return [
        ...(0, gameRooms_validation_1.roomIdValidationRules)(),
        (0, express_validator_1.body)('ready').isBoolean().withMessage('El estado "ready" debe ser un valor booleano (true/false)'),
    ];
};
exports.readyStatusValidationRules = readyStatusValidationRules;
/**
 * Reglas de validación para expulsar a un jugador
 */
const kickPlayerValidationRules = () => {
    return [...(0, gameRooms_validation_1.roomIdValidationRules)(), (0, express_validator_1.body)('playerId').isMongoId().withMessage('ID de jugador inválido')];
};
exports.kickPlayerValidationRules = kickPlayerValidationRules;
/**
 * Reglas de validación para iniciar el juego
 */
const startGameValidationRules = () => {
    return [...(0, gameRooms_validation_1.roomIdValidationRules)()];
};
exports.startGameValidationRules = startGameValidationRules;
