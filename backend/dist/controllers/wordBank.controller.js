"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wordBank_service_1 = __importDefault(require("../services/wordBank.service"));
/**
 * Controlador para el banco de palabras
 */
class WordBankController {
    /**
     * Obtener todas las categorías de palabras
     */
    getAllCategories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const includeInactive = req.query.includeInactive === 'true';
                const categories = yield wordBank_service_1.default.getAllCategories(includeInactive);
                return res.status(200).json({
                    success: true,
                    data: categories,
                });
            }
            catch (error) {
                console.error('Error al obtener categorías:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al obtener categorías',
                });
            }
        });
    }
    /**
     * Obtener una categoría por su ID
     */
    getCategoryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield wordBank_service_1.default.getCategoryById(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: 'Categoría no encontrada',
                    });
                }
                return res.status(200).json({
                    success: true,
                    data: category,
                });
            }
            catch (error) {
                console.error('Error al obtener categoría:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al obtener categoría',
                });
            }
        });
    }
    /**
     * Crear una nueva categoría
     */
    createCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description, words, isActive } = req.body;
                // Validar datos
                if (!name || !description) {
                    return res.status(400).json({
                        success: false,
                        message: 'Se requieren nombre y descripción para la categoría',
                    });
                }
                const newCategory = yield wordBank_service_1.default.createCategory({
                    name,
                    description,
                    words: words || [],
                    isActive: isActive !== undefined ? isActive : true,
                });
                return res.status(201).json({
                    success: true,
                    data: newCategory,
                    message: 'Categoría creada con éxito',
                });
            }
            catch (error) {
                console.error('Error al crear categoría:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al crear categoría',
                });
            }
        });
    }
    /**
     * Actualizar una categoría
     */
    updateCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { name, description, isActive } = req.body;
                // Verificar si la categoría existe
                const categoryExists = yield wordBank_service_1.default.getCategoryById(id);
                if (!categoryExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Categoría no encontrada',
                    });
                }
                // Actualizar la categoría
                const updatedCategory = yield wordBank_service_1.default.updateCategory(id, Object.assign(Object.assign(Object.assign({}, (name && { name })), (description && { description })), (isActive !== undefined && { isActive })));
                return res.status(200).json({
                    success: true,
                    data: updatedCategory,
                    message: 'Categoría actualizada con éxito',
                });
            }
            catch (error) {
                console.error('Error al actualizar categoría:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al actualizar categoría',
                });
            }
        });
    }
    /**
     * Desactivar una categoría
     */
    deactivateCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // Verificar si la categoría existe
                const categoryExists = yield wordBank_service_1.default.getCategoryById(id);
                if (!categoryExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Categoría no encontrada',
                    });
                }
                // Desactivar la categoría
                const deactivatedCategory = yield wordBank_service_1.default.deactivateCategory(id);
                return res.status(200).json({
                    success: true,
                    data: deactivatedCategory,
                    message: 'Categoría desactivada con éxito',
                });
            }
            catch (error) {
                console.error('Error al desactivar categoría:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al desactivar categoría',
                });
            }
        });
    }
    /**
     * Agregar una palabra a una categoría
     */
    addWordToCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { word, difficulty = 'medium' } = req.body;
                // Validar datos
                if (!word) {
                    return res.status(400).json({
                        success: false,
                        message: 'Se requiere una palabra',
                    });
                }
                // Verificar si la categoría existe
                const categoryExists = yield wordBank_service_1.default.getCategoryById(id);
                if (!categoryExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Categoría no encontrada',
                    });
                }
                // Validar dificultad
                if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
                    return res.status(400).json({
                        success: false,
                        message: 'La dificultad debe ser easy, medium o hard',
                    });
                }
                // Agregar la palabra
                const updatedCategory = yield wordBank_service_1.default.addWordToCategory(id, {
                    word,
                    difficulty: difficulty,
                });
                return res.status(200).json({
                    success: true,
                    data: updatedCategory,
                    message: 'Palabra agregada con éxito',
                });
            }
            catch (error) {
                console.error('Error al agregar palabra:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al agregar palabra',
                });
            }
        });
    }
    /**
     * Eliminar una palabra de una categoría
     */
    removeWordFromCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { categoryId, wordId } = req.params;
                // Verificar si la categoría existe
                const categoryExists = yield wordBank_service_1.default.getCategoryById(categoryId);
                if (!categoryExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Categoría no encontrada',
                    });
                }
                // Eliminar la palabra
                const updatedCategory = yield wordBank_service_1.default.removeWordFromCategory(categoryId, wordId);
                return res.status(200).json({
                    success: true,
                    data: updatedCategory,
                    message: 'Palabra eliminada con éxito',
                });
            }
            catch (error) {
                console.error('Error al eliminar palabra:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al eliminar palabra',
                });
            }
        });
    }
    /**
     * Obtener palabras aleatorias para el juego
     */
    getRandomWords(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const count = parseInt(req.query.count) || 3;
                const difficulty = req.query.difficulty;
                const categoryId = req.query.categoryId;
                let words;
                if (categoryId) {
                    // Verificar si la categoría existe
                    const categoryExists = yield wordBank_service_1.default.getCategoryById(categoryId);
                    if (!categoryExists) {
                        return res.status(404).json({
                            success: false,
                            message: 'Categoría no encontrada',
                        });
                    }
                    // Obtener palabras de la categoría específica
                    words = yield wordBank_service_1.default.getRandomWordsFromCategory(categoryId, count, difficulty);
                }
                else {
                    // Obtener palabras de cualquier categoría
                    words = yield wordBank_service_1.default.getRandomWords(count, difficulty);
                }
                return res.status(200).json({
                    success: true,
                    data: words,
                });
            }
            catch (error) {
                console.error('Error al obtener palabras aleatorias:', error);
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Error al obtener palabras aleatorias',
                });
            }
        });
    }
}
exports.default = new WordBankController();
