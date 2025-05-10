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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameWordBankModel = exports.WordDifficulty = void 0;
const mongoose_1 = require("mongoose");
/**
 * Enumeración para los niveles de dificultad de palabras
 */
var WordDifficulty;
(function (WordDifficulty) {
    WordDifficulty["EASY"] = "easy";
    WordDifficulty["MEDIUM"] = "medium";
    WordDifficulty["HARD"] = "hard";
})(WordDifficulty || (exports.WordDifficulty = WordDifficulty = {}));
/**
 * Esquema para cada palabra individual
 */
const WordSchema = new mongoose_1.Schema({
    word: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 30,
    },
    difficulty: {
        type: String,
        enum: Object.values(WordDifficulty),
        required: true,
        default: WordDifficulty.MEDIUM,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    lastUsed: {
        type: Date,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
});
/**
 * Esquema principal para el banco de palabras
 */
const GameWordBankSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    words: {
        type: [WordSchema],
        required: true,
        validate: {
            validator: function (words) {
                return words.length > 0;
            },
            message: 'La categoría debe contener al menos una palabra',
        },
    },
    language: {
        type: String,
        required: true,
        default: 'es', // Español por defecto
        minlength: 2,
        maxlength: 5,
    },
    displayName: {
        type: Map,
        of: String,
        default: {},
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    isCustom: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
// Índices para consultas eficientes
GameWordBankSchema.index({ name: 1, language: 1 }, { unique: true }); // Nombre único por idioma
GameWordBankSchema.index({ isDefault: 1 }); // Para buscar categorías predeterminadas
GameWordBankSchema.index({ isCustom: 1, createdBy: 1 }); // Para buscar categorías personalizadas por usuario
GameWordBankSchema.index({ 'words.word': 1 }); // Para buscar palabras específicas
// Método para obtener palabras aleatorias según dificultad
GameWordBankSchema.methods.getRandomWords = function (difficulty = 'any', count = 3) {
    // Filtrar palabras habilitadas
    let availableWords = this.words.filter((word) => word.enabled);
    // Filtrar por dificultad si es necesario
    if (difficulty !== 'any') {
        availableWords = availableWords.filter((word) => word.difficulty === difficulty);
    }
    // Si no hay suficientes palabras, devolver todas las disponibles
    if (availableWords.length <= count) {
        return [...availableWords];
    }
    // Mezclar el array usando Fisher-Yates shuffle
    for (let i = availableWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableWords[i], availableWords[j]] = [availableWords[j], availableWords[i]];
    }
    // Devolver el número solicitado de palabras
    return availableWords.slice(0, count);
};
// Método para marcar una palabra como usada
GameWordBankSchema.methods.markWordAsUsed = function (wordId) {
    return __awaiter(this, void 0, void 0, function* () {
        const wordIndex = this.words.findIndex((word) => word._id.equals(wordId));
        if (wordIndex >= 0) {
            this.words[wordIndex].usageCount += 1;
            this.words[wordIndex].lastUsed = new Date();
            yield this.save();
            return true;
        }
        return false;
    });
};
// Método para añadir una nueva palabra
GameWordBankSchema.methods.addWord = function (word_1) {
    return __awaiter(this, arguments, void 0, function* (word, difficulty = WordDifficulty.MEDIUM) {
        // Verificar si la palabra ya existe
        const exists = this.words.some((w) => w.word.toLowerCase() === word.toLowerCase());
        if (exists) {
            return { success: false, message: 'La palabra ya existe en esta categoría' };
        }
        // Añadir la nueva palabra
        this.words.push({
            word,
            difficulty,
            usageCount: 0,
            enabled: true,
        });
        yield this.save();
        return { success: true, message: 'Palabra añadida correctamente' };
    });
};
// Método estático para crear las categorías predeterminadas
GameWordBankSchema.statics.createDefaultCategories = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const categories = [
            {
                name: 'animals',
                displayName: {
                    es: 'Animales',
                    en: 'Animals',
                },
                language: 'es',
                isDefault: true,
                isCustom: false,
                words: [
                    { word: 'perro', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
                    { word: 'gato', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
                    { word: 'elefante', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
                    { word: 'jirafa', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
                    { word: 'ornitorrinco', difficulty: WordDifficulty.HARD, usageCount: 0, enabled: true },
                ],
            },
            {
                name: 'food',
                displayName: {
                    es: 'Comida',
                    en: 'Food',
                },
                language: 'es',
                isDefault: true,
                isCustom: false,
                words: [
                    { word: 'pizza', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
                    { word: 'hamburguesa', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
                    { word: 'espagueti', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
                    { word: 'sushi', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
                    { word: 'gazpacho', difficulty: WordDifficulty.HARD, usageCount: 0, enabled: true },
                ],
            },
        ];
        for (const category of categories) {
            // Verificar si ya existe
            const exists = yield this.findOne({ name: category.name, language: category.language });
            if (!exists) {
                yield this.create(category);
            }
        }
    });
};
// Exportar el modelo
exports.GameWordBankModel = (0, mongoose_1.model)('GameWordBank', GameWordBankSchema);
