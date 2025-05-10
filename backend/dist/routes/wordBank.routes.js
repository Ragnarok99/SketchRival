"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wordBank_controller_1 = __importDefault(require("../controllers/wordBank.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Rutas públicas
router.get('/random', wordBank_controller_1.default.getRandomWords);
// Rutas protegidas (solo para usuarios autenticados)
router.get('/', auth_middleware_1.protectRoute, wordBank_controller_1.default.getAllCategories);
router.get('/:id', auth_middleware_1.protectRoute, wordBank_controller_1.default.getCategoryById);
router.post('/', auth_middleware_1.protectRoute, wordBank_controller_1.default.createCategory);
router.put('/:id', auth_middleware_1.protectRoute, wordBank_controller_1.default.updateCategory);
router.delete('/:id', auth_middleware_1.protectRoute, wordBank_controller_1.default.deactivateCategory);
router.post('/:id/words', auth_middleware_1.protectRoute, wordBank_controller_1.default.addWordToCategory);
router.delete('/:categoryId/words/:wordId', auth_middleware_1.protectRoute, wordBank_controller_1.default.removeWordFromCategory);
exports.default = router;
