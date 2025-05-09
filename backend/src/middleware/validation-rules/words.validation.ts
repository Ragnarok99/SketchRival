import { body, param, query } from 'express-validator';
import { WordDifficulty } from '../../models';

// Validación para obtener categorías de palabras
export const getWordCategoriesValidationRules = () => [
  query('lang')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('El código de idioma debe tener entre 2 y 5 caracteres'),
];

// Validación para obtener palabras de una categoría
export const getCategoryWordsValidationRules = () => [
  param('id').isMongoId().withMessage('ID de categoría inválido'),
  query('difficulty')
    .optional()
    .isIn(Object.values(WordDifficulty))
    .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
  query('enabled').optional().isBoolean().withMessage('El parámetro enabled debe ser un valor booleano'),
];

// Validación para obtener palabras aleatorias
export const getRandomWordsValidationRules = () => [
  body('roomId').isMongoId().withMessage('ID de sala inválido'),
  body('count').optional().isInt({ min: 1, max: 20 }).withMessage('La cantidad debe ser un número entre 1 y 20'),
  body('difficulty')
    .optional()
    .isIn([...Object.values(WordDifficulty), 'any'])
    .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard, any'),
];

// Validación para crear una nueva categoría
export const createWordCategoryValidationRules = () => [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre de la categoría debe tener entre 2 y 50 caracteres'),
  body('displayName')
    .isObject()
    .withMessage('displayName debe ser un objeto con idiomas como claves')
    .custom((value) => {
      return Object.keys(value).length > 0;
    })
    .withMessage('Se requiere al menos un nombre localizado'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La descripción no debe exceder los 200 caracteres'),
  body('language')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 5 })
    .withMessage('El código de idioma debe tener entre 2 y 5 caracteres'),
  body('words').optional().isArray().withMessage('words debe ser un array'),
];

// Validación para actualizar una categoría
export const updateWordCategoryValidationRules = () => [
  param('id').isMongoId().withMessage('ID de categoría inválido'),
  body('displayName').optional().isObject().withMessage('displayName debe ser un objeto con idiomas como claves'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La descripción no debe exceder los 200 caracteres'),
];

// Validación para añadir palabras a una categoría
export const addWordsToCategoryValidationRules = () => [
  param('id').isMongoId().withMessage('ID de categoría inválido'),
  body('words').isArray({ min: 1 }).withMessage('Se requiere al menos una palabra para añadir'),
  body('words.*.word')
    .isString()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Cada palabra debe tener entre 2 y 30 caracteres'),
  body('words.*.difficulty')
    .optional()
    .isIn(Object.values(WordDifficulty))
    .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
];

// Validación para actualizar una palabra
export const updateWordValidationRules = () => [
  param('id').isMongoId().withMessage('ID de categoría inválido'),
  param('wordId').isMongoId().withMessage('ID de palabra inválido'),
  body('word')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('La palabra debe tener entre 2 y 30 caracteres'),
  body('difficulty')
    .optional()
    .isIn(Object.values(WordDifficulty))
    .withMessage('Dificultad inválida. Valores permitidos: easy, medium, hard'),
  body('enabled').optional().isBoolean().withMessage('El parámetro enabled debe ser un valor booleano'),
];
