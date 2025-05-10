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
const WordBank_model_1 = __importDefault(require("../models/WordBank.model"));
class WordBankService {
    /**
     * Crear una nueva categoría de palabras
     */
    createCategory(categoryData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const category = new WordBank_model_1.default(categoryData);
                yield category.save();
                return category;
            }
            catch (error) {
                throw new Error(`Error al crear categoría: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Obtener todas las categorías activas
     */
    getAllCategories() {
        return __awaiter(this, arguments, void 0, function* (includeInactive = false) {
            try {
                const query = includeInactive ? {} : { isActive: true };
                return yield WordBank_model_1.default.find(query).sort({ name: 1 });
            }
            catch (error) {
                throw new Error(`Error al obtener categorías: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Obtener una categoría por su ID
     */
    getCategoryById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield WordBank_model_1.default.findById(id);
            }
            catch (error) {
                throw new Error(`Error al obtener categoría: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Actualizar una categoría
     */
    updateCategory(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield WordBank_model_1.default.findByIdAndUpdate(id, updateData, { new: true });
            }
            catch (error) {
                throw new Error(`Error al actualizar categoría: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Desactivar una categoría
     */
    deactivateCategory(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield WordBank_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
            }
            catch (error) {
                throw new Error(`Error al desactivar categoría: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Agregar una palabra a una categoría
     */
    addWordToCategory(categoryId, word) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield WordBank_model_1.default.findByIdAndUpdate(categoryId, { $push: { words: word } }, { new: true });
            }
            catch (error) {
                throw new Error(`Error al agregar palabra: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Eliminar una palabra de una categoría
     */
    removeWordFromCategory(categoryId, wordId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield WordBank_model_1.default.findByIdAndUpdate(categoryId, { $pull: { words: { _id: wordId } } }, { new: true });
            }
            catch (error) {
                throw new Error(`Error al eliminar palabra: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Obtener palabras aleatorias de una categoría específica
     */
    getRandomWordsFromCategory(categoryId_1) {
        return __awaiter(this, arguments, void 0, function* (categoryId, count = 3, difficulty) {
            try {
                const category = yield WordBank_model_1.default.findById(categoryId);
                if (!category)
                    throw new Error('Categoría no encontrada');
                let filteredWords = category.words;
                // Filtrar por dificultad si se especifica
                if (difficulty) {
                    filteredWords = filteredWords.filter((word) => word.difficulty === difficulty);
                }
                // Si no hay suficientes palabras en la dificultad especificada, usar todas
                if (filteredWords.length < count) {
                    filteredWords = category.words;
                }
                // Barajar palabras y tomar la cantidad solicitada
                const shuffled = [...filteredWords].sort(() => 0.5 - Math.random());
                return shuffled.slice(0, count).map((word) => word.word);
            }
            catch (error) {
                throw new Error(`Error al obtener palabras aleatorias: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Obtener palabras aleatorias de categorías aleatorias
     */
    getRandomWords() {
        return __awaiter(this, arguments, void 0, function* (count = 3, difficulty) {
            try {
                // Obtener categorías activas
                const categories = yield WordBank_model_1.default.find({ isActive: true });
                if (categories.length === 0)
                    throw new Error('No hay categorías activas');
                // Seleccionar una categoría aleatoria
                const randomCategory = categories[Math.floor(Math.random() * categories.length)];
                // Obtener palabras aleatorias de la categoría
                const categoryId = randomCategory._id.toString();
                return this.getRandomWordsFromCategory(categoryId, count, difficulty);
            }
            catch (error) {
                throw new Error(`Error al obtener palabras aleatorias: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
exports.default = new WordBankService();
