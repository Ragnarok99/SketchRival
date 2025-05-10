"use strict";
// Servicio para generar palabras aleatorias
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
exports.generateRandomWords = exports.getRandomWords = void 0;
// Diccionario básico de palabras por categorías
const wordDictionary = {
    animales: ['perro', 'gato', 'elefante', 'jirafa', 'león', 'tigre', 'oso', 'mono'],
    objetos: ['mesa', 'silla', 'teléfono', 'lámpara', 'reloj', 'libro', 'bolígrafo', 'televisor'],
    comida: ['pizza', 'hamburguesa', 'pasta', 'ensalada', 'helado', 'chocolate', 'taco', 'sushi'],
    deportes: ['fútbol', 'baloncesto', 'tenis', 'natación', 'atletismo', 'golf', 'béisbol', 'voleibol'],
    países: ['España', 'Francia', 'Italia', 'Alemania', 'Japón', 'Brasil', 'México', 'India'],
};
/**
 * Obtener palabras aleatorias de categorías específicas
 */
const getRandomWords = (categories = ['animales', 'objetos'], count = 3) => {
    // Crear una lista de todas las palabras en las categorías solicitadas
    const allWords = [];
    categories.forEach((category) => {
        if (wordDictionary[category]) {
            allWords.push(...wordDictionary[category]);
        }
    });
    if (allWords.length === 0) {
        return ['gato', 'perro', 'casa']; // Palabras por defecto
    }
    // Seleccionar palabras aleatorias
    const result = [];
    const maxWords = Math.min(count, allWords.length);
    while (result.length < maxWords) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        const word = allWords[randomIndex];
        if (!result.includes(word)) {
            result.push(word);
        }
    }
    return result;
};
exports.getRandomWords = getRandomWords;
/**
 * Generar palabras aleatorias para un juego
 */
const generateRandomWords = (gameId_1, ...args_1) => __awaiter(void 0, [gameId_1, ...args_1], void 0, function* (gameId, categories = ['animales', 'objetos']) {
    try {
        // Obtener palabras aleatorias
        const words = (0, exports.getRandomWords)(categories, 10);
        // En una implementación real, guardaríamos estas palabras en la base de datos
        console.log(`Palabras generadas para el juego ${gameId}:`, words);
        return words;
    }
    catch (error) {
        console.error('Error generando palabras aleatorias:', error);
        throw error;
    }
});
exports.generateRandomWords = generateRandomWords;
