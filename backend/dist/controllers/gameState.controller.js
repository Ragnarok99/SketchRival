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
exports.timerEnd = exports.resetGame = exports.endGame = exports.nextRound = exports.submitGuess = exports.submitDrawing = exports.selectWord = exports.getGameState = exports.startGame = void 0;
const GameState_model_1 = require("../models/GameState.model");
const gameState_service_1 = __importDefault(require("../services/gameState.service"));
/**
 * Iniciar un nuevo juego
 */
const startGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Procesar evento de inicio de juego
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.START_GAME, null, userId);
        return res.status(200).json({
            message: 'Juego iniciado correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al iniciar juego:', error);
        return res.status(500).json({
            message: 'Error al iniciar el juego',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.startGame = startGame;
/**
 * Obtener el estado actual del juego
 */
const getGameState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const gameState = yield gameState_service_1.default.getGameState(roomId);
        if (!gameState) {
            return res.status(404).json({ message: 'Estado de juego no encontrado' });
        }
        return res.status(200).json({
            gameState,
        });
    }
    catch (error) {
        console.error('Error al obtener estado del juego:', error);
        return res.status(500).json({
            message: 'Error al obtener el estado del juego',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.getGameState = getGameState;
/**
 * Seleccionar una palabra para dibujar
 */
const selectWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const { word } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        if (!word) {
            return res.status(400).json({ message: 'Se requiere una palabra' });
        }
        // Procesar evento de selección de palabra
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.SELECT_WORD, { word }, userId);
        return res.status(200).json({
            message: 'Palabra seleccionada correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al seleccionar palabra:', error);
        return res.status(500).json({
            message: 'Error al seleccionar palabra',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.selectWord = selectWord;
/**
 * Enviar un dibujo
 */
const submitDrawing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const { imageData } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        if (!imageData) {
            return res.status(400).json({ message: 'Se requieren datos de imagen' });
        }
        // Procesar evento de envío de dibujo
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.SUBMIT_DRAWING, { imageData }, userId);
        return res.status(200).json({
            message: 'Dibujo enviado correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al enviar dibujo:', error);
        return res.status(500).json({
            message: 'Error al enviar dibujo',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.submitDrawing = submitDrawing;
/**
 * Enviar una adivinanza
 */
const submitGuess = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const { guess, drawingId, username } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        if (!guess) {
            return res.status(400).json({ message: 'Se requiere una adivinanza' });
        }
        if (!drawingId) {
            return res.status(400).json({ message: 'Se requiere ID del dibujo' });
        }
        // Procesar evento de envío de adivinanza
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.SUBMIT_GUESS, { guess, drawingId, username }, userId);
        return res.status(200).json({
            message: 'Adivinanza enviada correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al enviar adivinanza:', error);
        return res.status(500).json({
            message: 'Error al enviar adivinanza',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.submitGuess = submitGuess;
/**
 * Avanzar a la siguiente ronda
 */
const nextRound = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Procesar evento de siguiente ronda
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.NEXT_ROUND, null, userId);
        return res.status(200).json({
            message: 'Avanzado a siguiente ronda',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al avanzar a siguiente ronda:', error);
        return res.status(500).json({
            message: 'Error al avanzar a siguiente ronda',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.nextRound = nextRound;
/**
 * Finalizar el juego
 */
const endGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Procesar evento de fin de juego
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.END_GAME, null, userId);
        return res.status(200).json({
            message: 'Juego finalizado correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al finalizar juego:', error);
        return res.status(500).json({
            message: 'Error al finalizar juego',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.endGame = endGame;
/**
 * Reiniciar el juego
 */
const resetGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Procesar evento de reinicio de juego
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.RESET_GAME, null, userId);
        return res.status(200).json({
            message: 'Juego reiniciado correctamente',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al reiniciar juego:', error);
        return res.status(500).json({
            message: 'Error al reiniciar juego',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.resetGame = resetGame;
/**
 * Manejar un evento de temporizador finalizado
 */
const timerEnd = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roomId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        // Procesar evento de fin de temporizador
        const gameState = yield gameState_service_1.default.processEvent(roomId, GameState_model_1.GameEvent.TIMER_END, null, userId);
        return res.status(200).json({
            message: 'Temporizador finalizado',
            gameState,
        });
    }
    catch (error) {
        console.error('Error al finalizar temporizador:', error);
        return res.status(500).json({
            message: 'Error al finalizar temporizador',
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.timerEnd = timerEnd;
