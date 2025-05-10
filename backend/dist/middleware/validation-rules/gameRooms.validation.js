"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.joinRoomValidationRules = exports.roomIdValidationRules = exports.updateRoomValidationRules = exports.createRoomValidationRules = void 0;
const express_validator_1 = require("express-validator");
const GameRoom_model_1 = require("../../models/GameRoom.model");
const createRoomValidationRules = () => {
    return [
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),
        (0, express_validator_1.body)('type').optional().isIn(Object.values(GameRoom_model_1.GameRoomType)).withMessage('Tipo de sala inválido'),
        // Validación del objeto de configuración
        (0, express_validator_1.body)('configuration.maxPlayers')
            .optional()
            .isInt({ min: 2, max: 10 })
            .withMessage('El número máximo de jugadores debe estar entre 2 y 10'),
        (0, express_validator_1.body)('configuration.roundTime')
            .optional()
            .isInt({ min: 30, max: 300 })
            .withMessage('El tiempo por ronda debe estar entre 30 y 300 segundos'),
        (0, express_validator_1.body)('configuration.totalRounds')
            .optional()
            .isInt({ min: 1, max: 20 })
            .withMessage('El número total de rondas debe estar entre 1 y 20'),
        (0, express_validator_1.body)('configuration.drawingCategories').optional().isArray().withMessage('Las categorías deben ser un arreglo'),
        (0, express_validator_1.body)('configuration.allowCustomWords')
            .optional()
            .isBoolean()
            .withMessage('allowCustomWords debe ser un valor booleano'),
        (0, express_validator_1.body)('configuration.customWords')
            .optional()
            .isArray()
            .withMessage('Las palabras personalizadas deben ser un arreglo'),
        (0, express_validator_1.body)('configuration.difficulty')
            .optional()
            .isIn(['easy', 'medium', 'hard'])
            .withMessage('La dificultad debe ser easy, medium o hard'),
    ];
};
exports.createRoomValidationRules = createRoomValidationRules;
const updateRoomValidationRules = () => {
    return [
        (0, express_validator_1.body)('name')
            .optional()
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),
        (0, express_validator_1.body)('status').optional().isIn(Object.values(GameRoom_model_1.GameRoomStatus)).withMessage('Estado de sala inválido'),
        // Validaciones para configuración igual que en createRoomValidationRules
        (0, express_validator_1.body)('configuration.maxPlayers')
            .optional()
            .isInt({ min: 2, max: 10 })
            .withMessage('El número máximo de jugadores debe estar entre 2 y 10'),
        (0, express_validator_1.body)('configuration.roundTime')
            .optional()
            .isInt({ min: 30, max: 300 })
            .withMessage('El tiempo por ronda debe estar entre 30 y 300 segundos'),
        (0, express_validator_1.body)('configuration.totalRounds')
            .optional()
            .isInt({ min: 1, max: 20 })
            .withMessage('El número total de rondas debe estar entre 1 y 20'),
        (0, express_validator_1.body)('configuration.drawingCategories').optional().isArray().withMessage('Las categorías deben ser un arreglo'),
        (0, express_validator_1.body)('configuration.allowCustomWords')
            .optional()
            .isBoolean()
            .withMessage('allowCustomWords debe ser un valor booleano'),
        (0, express_validator_1.body)('configuration.customWords')
            .optional()
            .isArray()
            .withMessage('Las palabras personalizadas deben ser un arreglo'),
        (0, express_validator_1.body)('configuration.difficulty')
            .optional()
            .isIn(['easy', 'medium', 'hard'])
            .withMessage('La dificultad debe ser easy, medium o hard'),
    ];
};
exports.updateRoomValidationRules = updateRoomValidationRules;
const roomIdValidationRules = () => {
    return [(0, express_validator_1.param)('id').isMongoId().withMessage('ID de sala inválido')];
};
exports.roomIdValidationRules = roomIdValidationRules;
const joinRoomValidationRules = () => {
    return [
        (0, express_validator_1.body)('accessCode')
            .optional()
            .isString()
            .isLength({ min: 6, max: 8 })
            .withMessage('El código de acceso debe tener entre 6 y 8 caracteres'),
    ];
};
exports.joinRoomValidationRules = joinRoomValidationRules;
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map((err) => {
        if (err.type === 'field') {
            extractedErrors.push({ [err.path]: err.msg });
        }
    });
    return res.status(422).json({
        errors: extractedErrors,
    });
};
exports.validate = validate;
