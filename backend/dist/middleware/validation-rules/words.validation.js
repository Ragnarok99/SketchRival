"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWordValidationRules = exports.addWordsToCategoryValidationRules = exports.updateWordCategoryValidationRules = exports.createWordCategoryValidationRules = exports.getRandomWordsValidationRules = exports.getCategoryWordsValidationRules = exports.getWordCategoriesValidationRules = void 0;
const express_validator_1 = require("express-validator");
const models_1 = require("../../models");
// Validación para obtener categorías de palabras
const getWordCategoriesValidationRules = () => [
    (0, express_validator_1.query)('lang')
        .optional()
        .isLength({ min: 2, max: 5 })
        .withMessage('El código de idioma debe tener entre 2 y 5 caracteres'),
];
exports.getWordCategoriesValidationRules = getWordCategoriesValidationRules;
// Validación para obtener palabras de una categoría
const getCategoryWordsValidationRules = () => [
    (0, express_validator_1.param)('id').isMongoId().withMessage('ID de categoría inválido'),
    (0, express_validator_1.query)('difficulty')
        .optional()
        .isIn(Object.values(models_1.WordDifficulty))
        .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
    (0, express_validator_1.query)('enabled').optional().isBoolean().withMessage('El parámetro enabled debe ser un valor booleano'),
];
exports.getCategoryWordsValidationRules = getCategoryWordsValidationRules;
// Validación para obtener palabras aleatorias
const getRandomWordsValidationRules = () => [
    (0, express_validator_1.body)('roomId').isMongoId().withMessage('ID de sala inválido'),
    (0, express_validator_1.body)('count').optional().isInt({ min: 1, max: 20 }).withMessage('La cantidad debe ser un número entre 1 y 20'),
    (0, express_validator_1.body)('difficulty')
        .optional()
        .isIn([...Object.values(models_1.WordDifficulty), 'any'])
        .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard, any'),
];
exports.getRandomWordsValidationRules = getRandomWordsValidationRules;
// Validación para crear una nueva categoría
const createWordCategoryValidationRules = () => [
    (0, express_validator_1.body)('name')
        .isString()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre de la categoría debe tener entre 2 y 50 caracteres'),
    (0, express_validator_1.body)('displayName')
        .isObject()
        .withMessage('displayName debe ser un objeto con idiomas como claves')
        .custom((value) => {
        return Object.keys(value).length > 0;
    })
        .withMessage('Se requiere al menos un nombre localizado'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('La descripción no debe exceder los 200 caracteres'),
    (0, express_validator_1.body)('language')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 5 })
        .withMessage('El código de idioma debe tener entre 2 y 5 caracteres'),
    (0, express_validator_1.body)('words').optional().isArray().withMessage('words debe ser un array'),
];
exports.createWordCategoryValidationRules = createWordCategoryValidationRules;
// Validación para actualizar una categoría
const updateWordCategoryValidationRules = () => [
    (0, express_validator_1.param)('id').isMongoId().withMessage('ID de categoría inválido'),
    (0, express_validator_1.body)('displayName').optional().isObject().withMessage('displayName debe ser un objeto con idiomas como claves'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('La descripción no debe exceder los 200 caracteres'),
];
exports.updateWordCategoryValidationRules = updateWordCategoryValidationRules;
// Validación para añadir palabras a una categoría
const addWordsToCategoryValidationRules = () => [
    (0, express_validator_1.param)('id').isMongoId().withMessage('ID de categoría inválido'),
    (0, express_validator_1.body)('words').isArray({ min: 1 }).withMessage('Se requiere al menos una palabra para añadir'),
    (0, express_validator_1.body)('words.*.word')
        .isString()
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage('Cada palabra debe tener entre 2 y 30 caracteres'),
    (0, express_validator_1.body)('words.*.difficulty')
        .optional()
        .isIn(Object.values(models_1.WordDifficulty))
        .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
];
exports.addWordsToCategoryValidationRules = addWordsToCategoryValidationRules;
// Validación para actualizar una palabra
const updateWordValidationRules = () => [
    (0, express_validator_1.param)('id').isMongoId().withMessage('ID de categoría inválido'),
    (0, express_validator_1.param)('wordId').isMongoId().withMessage('ID de palabra inválido'),
    (0, express_validator_1.body)('word')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage('La palabra debe tener entre 2 y 30 caracteres'),
    (0, express_validator_1.body)('difficulty')
        .optional()
        .isIn(Object.values(models_1.WordDifficulty))
        .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
    (0, express_validator_1.body)('enabled').optional().isBoolean().withMessage('El parámetro enabled debe ser un valor booleano'),
];
exports.updateWordValidationRules = updateWordValidationRules;
