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
const wordsController = __importStar(require("../controllers/words.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const words_validation_1 = require("../middleware/validation-rules/words.validation");
const router = (0, express_1.Router)();
// GET /words/categories - Obtener categorías de palabras disponibles
router.get('/categories', rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.getWordCategoriesValidationRules)(), validation_middleware_1.validate, wordsController.getWordCategories);
// GET /words/categories/:id - Obtener palabras de una categoría específica
router.get('/categories/:id', rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.getCategoryWordsValidationRules)(), validation_middleware_1.validate, wordsController.getCategoryWords);
// POST /words/random - Obtener palabras aleatorias para una sala
router.post('/random', auth_middleware_1.protect, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.getRandomWordsValidationRules)(), validation_middleware_1.validate, wordsController.getRandomWords);
// --- Rutas de administración (requieren rol de admin) ---
// POST /words/categories - Crear nueva categoría de palabras
router.post('/categories', auth_middleware_1.protect, admin_middleware_1.adminOnly, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.createWordCategoryValidationRules)(), validation_middleware_1.validate, wordsController.createWordCategory);
// PUT /words/categories/:id - Actualizar una categoría de palabras
router.put('/categories/:id', auth_middleware_1.protect, admin_middleware_1.adminOnly, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.updateWordCategoryValidationRules)(), validation_middleware_1.validate, wordsController.updateWordCategory);
// POST /words/categories/:id/words - Añadir palabras a una categoría
router.post('/categories/:id/words', auth_middleware_1.protect, admin_middleware_1.adminOnly, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.addWordsToCategoryValidationRules)(), validation_middleware_1.validate, wordsController.addWordsToCategory);
// PUT /words/categories/:id/words/:wordId - Actualizar una palabra específica
router.put('/categories/:id/words/:wordId', auth_middleware_1.protect, admin_middleware_1.adminOnly, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.updateWordValidationRules)(), validation_middleware_1.validate, wordsController.updateWord);
// DELETE /words/categories/:id/words/:wordId - Eliminar una palabra específica
router.delete('/categories/:id/words/:wordId', auth_middleware_1.protect, admin_middleware_1.adminOnly, rate_limit_middleware_1.wordsLimiter, (0, words_validation_1.updateWordValidationRules)(), validation_middleware_1.validate, wordsController.deleteWord);
exports.default = router;
