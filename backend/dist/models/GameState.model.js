"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateModel = exports.GameEvent = exports.GameState = void 0;
const mongoose_1 = require("mongoose");
// Enumeración para los estados del juego
var GameState;
(function (GameState) {
    // Estados principales del juego
    GameState["WAITING"] = "waiting";
    GameState["STARTING"] = "starting";
    GameState["WORD_SELECTION"] = "wordSelection";
    GameState["DRAWING"] = "drawing";
    GameState["GUESSING"] = "guessing";
    GameState["ROUND_END"] = "roundEnd";
    GameState["GAME_END"] = "gameEnd";
    // Estados auxiliares
    GameState["PAUSED"] = "paused";
    GameState["ERROR"] = "error";
})(GameState || (exports.GameState = GameState = {}));
// Enumeración para los eventos que provocan transiciones
var GameEvent;
(function (GameEvent) {
    GameEvent["START_GAME"] = "startGame";
    GameEvent["SELECT_WORD"] = "selectWord";
    GameEvent["START_DRAWING"] = "startDrawing";
    GameEvent["SUBMIT_DRAWING"] = "submitDrawing";
    GameEvent["SUBMIT_GUESS"] = "submitGuess";
    GameEvent["TIMER_END"] = "timerEnd";
    GameEvent["END_ROUND"] = "endRound";
    GameEvent["NEXT_ROUND"] = "nextRound";
    GameEvent["END_GAME"] = "endGame";
    GameEvent["PAUSE_GAME"] = "pauseGame";
    GameEvent["RESUME_GAME"] = "resumeGame";
    GameEvent["ERROR_OCCURRED"] = "errorOccurred";
    GameEvent["RESET_GAME"] = "resetGame";
})(GameEvent || (exports.GameEvent = GameEvent = {}));
// Esquema para el estado del juego en MongoDB
const GameStateSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'GameRoom',
        required: true,
        index: true,
    },
    currentState: {
        type: String,
        enum: Object.values(GameState),
        required: true,
        default: GameState.WAITING,
    },
    previousState: {
        type: String,
        enum: Object.values(GameState),
    },
    currentRound: {
        type: Number,
        required: true,
        default: 0,
    },
    totalRounds: {
        type: Number,
        required: true,
        default: 3,
    },
    timeRemaining: {
        type: Number,
        required: true,
        default: 0,
    },
    currentDrawerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    currentWord: {
        type: String,
        select: false, // Oculto por defecto para evitar trampas
    },
    wordOptions: [
        {
            type: String,
        },
    ],
    scores: {
        type: Map,
        of: Number,
        default: new Map(),
    },
    drawings: [
        {
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            imageData: {
                type: String,
                required: true,
            },
            word: {
                type: String,
                required: true,
            },
            round: {
                type: Number,
                required: true,
            },
        },
    ],
    guesses: [
        {
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            drawingId: {
                type: mongoose_1.Schema.Types.ObjectId,
                required: true,
            },
            guess: {
                type: String,
                required: true,
            },
            correct: {
                type: Boolean,
                required: true,
                default: false,
            },
            score: {
                type: Number,
                required: true,
                default: 0,
            },
        },
    ],
    startedAt: {
        type: Date,
    },
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now,
    },
    error: {
        message: String,
        code: String,
    },
}, {
    timestamps: true,
});
// Índices para mejorar consultas
GameStateSchema.index({ roomId: 1 });
GameStateSchema.index({ roomId: 1, currentState: 1 });
GameStateSchema.index({ roomId: 1, 'drawings.round': 1 });
// Pre middleware para actualizar lastUpdated
GameStateSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});
// Exportar el modelo
exports.GameStateModel = (0, mongoose_1.model)('GameState', GameStateSchema);
