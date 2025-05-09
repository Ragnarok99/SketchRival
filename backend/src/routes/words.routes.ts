import { Router } from 'express';
import * as wordsController from '../controllers/words.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { adminOnly } from '../middleware/admin.middleware';
import { wordsLimiter } from '../middleware/rate-limit.middleware';
import {
  getWordCategoriesValidationRules,
  getCategoryWordsValidationRules,
  getRandomWordsValidationRules,
  createWordCategoryValidationRules,
  updateWordCategoryValidationRules,
  addWordsToCategoryValidationRules,
  updateWordValidationRules,
} from '../middleware/validation-rules/words.validation';

const router = Router();

// GET /words/categories - Obtener categorías de palabras disponibles
router.get(
  '/categories',
  wordsLimiter,
  getWordCategoriesValidationRules(),
  validate,
  wordsController.getWordCategories,
);

// GET /words/categories/:id - Obtener palabras de una categoría específica
router.get(
  '/categories/:id',
  wordsLimiter,
  getCategoryWordsValidationRules(),
  validate,
  wordsController.getCategoryWords,
);

// POST /words/random - Obtener palabras aleatorias para una sala
router.post(
  '/random',
  protect,
  wordsLimiter,
  getRandomWordsValidationRules(),
  validate,
  wordsController.getRandomWords,
);

// --- Rutas de administración (requieren rol de admin) ---

// POST /words/categories - Crear nueva categoría de palabras
router.post(
  '/categories',
  protect,
  adminOnly,
  wordsLimiter,
  createWordCategoryValidationRules(),
  validate,
  wordsController.createWordCategory,
);

// PUT /words/categories/:id - Actualizar una categoría de palabras
router.put(
  '/categories/:id',
  protect,
  adminOnly,
  wordsLimiter,
  updateWordCategoryValidationRules(),
  validate,
  wordsController.updateWordCategory,
);

// POST /words/categories/:id/words - Añadir palabras a una categoría
router.post(
  '/categories/:id/words',
  protect,
  adminOnly,
  wordsLimiter,
  addWordsToCategoryValidationRules(),
  validate,
  wordsController.addWordsToCategory,
);

// PUT /words/categories/:id/words/:wordId - Actualizar una palabra específica
router.put(
  '/categories/:id/words/:wordId',
  protect,
  adminOnly,
  wordsLimiter,
  updateWordValidationRules(),
  validate,
  wordsController.updateWord,
);

// DELETE /words/categories/:id/words/:wordId - Eliminar una palabra específica
router.delete(
  '/categories/:id/words/:wordId',
  protect,
  adminOnly,
  wordsLimiter,
  updateWordValidationRules(),
  validate,
  wordsController.deleteWord,
);

export default router;
