"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.roomIdValidationRules = exports.updateRoomConfigValidationRules = exports.createRoomWithConfigValidationRules = void 0;
const express_validator_1 = require("express-validator");
const GameRoom_model_1 = require("../../models/GameRoom.model");
const roomConfiguration_service_1 = require("../../services/roomConfiguration.service");
const createRoomWithConfigValidationRules = () => {
    return [
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),
        (0, express_validator_1.body)('type').optional().isIn(Object.values(GameRoom_model_1.GameRoomType)).withMessage('Tipo de sala inválido'),
        (0, express_validator_1.body)('preset').optional().isIn(Object.values(roomConfiguration_service_1.ConfigPreset)).withMessage('Preset de configuración inválido'),
        // Validaciones de configuración
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
        (0, express_validator_1.body)('configuration.drawingCategories')
            .optional()
            .isArray()
            .withMessage('Las categorías deben ser un arreglo')
            .custom((categories) => {
            if (!Array.isArray(categories) || categories.length === 0) {
                throw new Error('Debe seleccionar al menos una categoría');
            }
            // Verificar que todas las categorías sean válidas
            const invalidCategories = categories.filter((cat) => !roomConfiguration_service_1.AVAILABLE_CATEGORIES.includes(cat));
            if (invalidCategories.length > 0) {
                throw new Error(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
            }
            return true;
        }),
        (0, express_validator_1.body)('configuration.allowCustomWords')
            .optional()
            .isBoolean()
            .withMessage('allowCustomWords debe ser un valor booleano'),
        (0, express_validator_1.body)('configuration.customWords')
            .optional()
            .isArray()
            .withMessage('Las palabras personalizadas deben ser un arreglo')
            .custom((words, { req }) => {
            // Solo validar si allowCustomWords es true
            if (req.body.configuration.allowCustomWords === true) {
                if (!Array.isArray(words) || words.length === 0) {
                    throw new Error('Debe proporcionar al menos una palabra personalizada');
                }
            }
            return true;
        }),
        (0, express_validator_1.body)('configuration.difficulty')
            .optional()
            .isIn(['easy', 'medium', 'hard'])
            .withMessage('La dificultad debe ser easy, medium o hard'),
    ];
};
exports.createRoomWithConfigValidationRules = createRoomWithConfigValidationRules;
const updateRoomConfigValidationRules = () => {
    return [
        (0, express_validator_1.body)('preset').optional().isIn(Object.values(roomConfiguration_service_1.ConfigPreset)).withMessage('Preset de configuración inválido'),
        // Mismas validaciones que en createRoomWithConfigValidationRules
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
        (0, express_validator_1.body)('configuration.drawingCategories')
            .optional()
            .isArray()
            .withMessage('Las categorías deben ser un arreglo')
            .custom((categories) => {
            if (categories && (!Array.isArray(categories) || categories.length === 0)) {
                throw new Error('Debe seleccionar al menos una categoría');
            }
            if (categories) {
                // Verificar que todas las categorías sean válidas
                const invalidCategories = categories.filter((cat) => !roomConfiguration_service_1.AVAILABLE_CATEGORIES.includes(cat));
                if (invalidCategories.length > 0) {
                    throw new Error(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
                }
            }
            return true;
        }),
        (0, express_validator_1.body)('configuration.allowCustomWords')
            .optional()
            .isBoolean()
            .withMessage('allowCustomWords debe ser un valor booleano'),
        (0, express_validator_1.body)('configuration.customWords')
            .optional()
            .isArray()
            .withMessage('Las palabras personalizadas deben ser un arreglo')
            .custom((words, { req }) => {
            // Solo validar si allowCustomWords es true
            if (req.body.configuration && req.body.configuration.allowCustomWords === true) {
                if (!Array.isArray(words) || words.length === 0) {
                    throw new Error('Debe proporcionar al menos una palabra personalizada');
                }
            }
            return true;
        }),
        (0, express_validator_1.body)('configuration.difficulty')
            .optional()
            .isIn(['easy', 'medium', 'hard'])
            .withMessage('La dificultad debe ser easy, medium o hard'),
    ];
};
exports.updateRoomConfigValidationRules = updateRoomConfigValidationRules;
const roomIdValidationRules = () => {
    return [(0, express_validator_1.param)('id').isMongoId().withMessage('ID de sala inválido')];
};
exports.roomIdValidationRules = roomIdValidationRules;
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
