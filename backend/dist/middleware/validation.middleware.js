"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.loginValidationRules = exports.registerValidationRules = void 0;
const express_validator_1 = require("express-validator");
const registerValidationRules = () => {
    return [
        (0, express_validator_1.body)('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
        (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
        (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ];
};
exports.registerValidationRules = registerValidationRules;
const loginValidationRules = () => {
    return [
        (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
        (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    ];
};
exports.loginValidationRules = loginValidationRules;
/**
 * Middleware para validar solicitudes utilizando express-validator
 */
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Error de validación en los datos enviados',
            errors: errors.array().map((error) => ({
                param: error.param,
                msg: error.msg,
                value: error.value,
            })),
        });
    }
    next();
};
exports.validate = validate;
