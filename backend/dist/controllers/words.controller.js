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
exports.deleteWord = exports.updateWord = exports.addWordsToCategory = exports.updateWordCategory = exports.createWordCategory = exports.getRandomWords = exports.getCategoryWords = exports.getWordCategories = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const gameRoomsService = __importStar(require("../services/gameRooms.service"));
// Obtener todas las categorías de palabras disponibles
const getWordCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const language = req.query.lang || 'es';
        // Filtrar categorías por idioma y solo incluir información básica
        const categories = yield models_1.GameWordBankModel.find({ language })
            .select('name displayName description isDefault isCustom createdBy')
            .lean();
        return res.status(200).json({
            categories,
            count: categories.length,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener categorías' });
    }
});
exports.getWordCategories = getWordCategories;
// Obtener palabras de una categoría específica
const getCategoryWords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de categoría inválido' });
        }
        const category = yield models_1.GameWordBankModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        // Aplicar filtros opcionales
        const difficulty = req.query.difficulty;
        const enabled = req.query.enabled === 'true';
        let filteredWords = [...category.words];
        if (difficulty) {
            filteredWords = filteredWords.filter((word) => word.difficulty === difficulty);
        }
        if (req.query.enabled !== undefined) {
            filteredWords = filteredWords.filter((word) => word.enabled === enabled);
        }
        return res.status(200).json({
            category: {
                _id: category._id,
                name: category.name,
                displayName: category.displayName,
                description: category.description,
                language: category.language,
                isDefault: category.isDefault,
                isCustom: category.isCustom,
            },
            words: filteredWords,
            count: filteredWords.length,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener palabras' });
    }
});
exports.getCategoryWords = getCategoryWords;
// Obtener palabras aleatorias para una sala
const getRandomWords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { roomId, count, difficulty } = req.body;
        if (!roomId || !mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ message: 'ID de sala inválido o faltante' });
        }
        const words = yield gameRoomsService.getRandomWordsForRoom(roomId, count || 3, difficulty || 'any');
        return res.status(200).json({
            words,
            count: words.length,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener palabras aleatorias' });
    }
});
exports.getRandomWords = getRandomWords;
// Crear nueva categoría de palabras
const createWordCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { name, displayName, description, language, words } = req.body;
        // Verificar que el nombre no esté ya en uso para este idioma
        const existing = yield models_1.GameWordBankModel.findOne({ name, language });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una categoría con este nombre e idioma' });
        }
        // Crear nueva categoría
        const newCategory = new models_1.GameWordBankModel({
            name,
            displayName,
            description,
            language: language || 'es',
            words: words || [],
            isDefault: false,
            isCustom: true,
            createdBy: req.user.userId,
        });
        yield newCategory.save();
        return res.status(201).json({
            message: 'Categoría creada exitosamente',
            category: newCategory,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al crear categoría' });
    }
});
exports.createWordCategory = createWordCategory;
// Actualizar una categoría de palabras
const updateWordCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { displayName, description } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de categoría inválido' });
        }
        const category = yield models_1.GameWordBankModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        // Verificar si es una categoría por defecto
        if (category.isDefault) {
            return res.status(403).json({ message: 'No se pueden modificar categorías por defecto' });
        }
        // Verificar si el usuario es el creador o un administrador
        if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
        }
        // Actualizar solo campos permitidos
        if (displayName)
            category.displayName = displayName;
        if (description)
            category.description = description;
        yield category.save();
        return res.status(200).json({
            message: 'Categoría actualizada exitosamente',
            category,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al actualizar categoría' });
    }
});
exports.updateWordCategory = updateWordCategory;
// Añadir palabras a una categoría
const addWordsToCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { words } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de categoría inválido' });
        }
        if (!words || !Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de palabras para añadir' });
        }
        const category = yield models_1.GameWordBankModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        // Verificar si el usuario es el creador o un administrador
        if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
        }
        // Añadir nuevas palabras, evitando duplicados
        const results = {
            added: 0,
            duplicates: 0,
            errors: [],
        };
        for (const word of words) {
            // Validar formato de palabra
            if (!word.word || typeof word.word !== 'string') {
                results.errors.push(`Palabra inválida: ${JSON.stringify(word)}`);
                continue;
            }
            // Normalizar palabra
            const normalizedWord = word.word.trim().toLowerCase();
            // Verificar duplicados
            if (category.words.some((w) => w.word.toLowerCase() === normalizedWord)) {
                results.duplicates++;
                continue;
            }
            // Añadir nueva palabra
            category.words.push({
                word: normalizedWord,
                difficulty: word.difficulty || models_1.WordDifficulty.MEDIUM,
                usageCount: 0,
                enabled: true,
            });
            results.added++;
        }
        if (results.added > 0) {
            yield category.save();
        }
        return res.status(200).json({
            message: `Se han añadido ${results.added} palabras a la categoría`,
            results,
            category,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al añadir palabras' });
    }
});
exports.addWordsToCategory = addWordsToCategory;
// Actualizar una palabra específica
const updateWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id, wordId } = req.params;
        const { word, difficulty, enabled } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de categoría inválido' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(wordId)) {
            return res.status(400).json({ message: 'ID de palabra inválido' });
        }
        const category = yield models_1.GameWordBankModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        // Verificar si el usuario es el creador o un administrador
        if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
        }
        // Buscar la palabra
        const wordIndex = category.words.findIndex((w) => w._id.toString() === wordId);
        if (wordIndex === -1) {
            return res.status(404).json({ message: 'Palabra no encontrada en esta categoría' });
        }
        // Actualizar campos permitidos
        if (word)
            category.words[wordIndex].word = word;
        if (difficulty)
            category.words[wordIndex].difficulty = difficulty;
        if (enabled !== undefined)
            category.words[wordIndex].enabled = enabled;
        yield category.save();
        return res.status(200).json({
            message: 'Palabra actualizada exitosamente',
            word: category.words[wordIndex],
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al actualizar palabra' });
    }
});
exports.updateWord = updateWord;
// Eliminar una palabra específica
const deleteWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id, wordId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de categoría inválido' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(wordId)) {
            return res.status(400).json({ message: 'ID de palabra inválido' });
        }
        const category = yield models_1.GameWordBankModel.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        // Verificar si el usuario es el creador o un administrador
        if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
        }
        // Verificar que no sea la última palabra
        if (category.words.length <= 1) {
            return res.status(400).json({ message: 'No se puede eliminar la última palabra de una categoría' });
        }
        // Buscar y eliminar la palabra
        const wordIndex = category.words.findIndex((w) => w._id.toString() === wordId);
        if (wordIndex === -1) {
            return res.status(404).json({ message: 'Palabra no encontrada en esta categoría' });
        }
        const deletedWord = category.words[wordIndex];
        category.words.splice(wordIndex, 1);
        yield category.save();
        return res.status(200).json({
            message: 'Palabra eliminada exitosamente',
            deletedWord,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al eliminar palabra' });
    }
});
exports.deleteWord = deleteWord;
