"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomModel = exports.VisualTheme = exports.ScoringSystem = exports.GameMode = exports.GameRoomType = exports.GameRoomStatus = void 0;
const mongoose_1 = require("mongoose");
// Enum para el estado de la sala
var GameRoomStatus;
(function (GameRoomStatus) {
    GameRoomStatus["WAITING"] = "waiting";
    GameRoomStatus["STARTING"] = "starting";
    GameRoomStatus["PLAYING"] = "playing";
    GameRoomStatus["FINISHED"] = "finished";
    GameRoomStatus["CLOSED"] = "closed";
})(GameRoomStatus || (exports.GameRoomStatus = GameRoomStatus = {}));
// Enum para el tipo de sala
var GameRoomType;
(function (GameRoomType) {
    GameRoomType["PUBLIC"] = "public";
    GameRoomType["PRIVATE"] = "private";
})(GameRoomType || (exports.GameRoomType = GameRoomType = {}));
// Enum para modos de juego
var GameMode;
(function (GameMode) {
    GameMode["CASUAL"] = "casual";
    GameMode["STANDARD"] = "standard";
    GameMode["COMPETITIVE"] = "competitive";
    GameMode["TIMED"] = "timed";
    GameMode["TEAM"] = "team";
    GameMode["CUSTOM"] = "custom";
})(GameMode || (exports.GameMode = GameMode = {}));
// Enum para sistemas de puntuación
var ScoringSystem;
(function (ScoringSystem) {
    ScoringSystem["STANDARD"] = "standard";
    ScoringSystem["PROGRESSIVE"] = "progressive";
    ScoringSystem["TIMED"] = "timed";
    ScoringSystem["ACCURACY"] = "accuracy";
    ScoringSystem["COMBO"] = "combo";
})(ScoringSystem || (exports.ScoringSystem = ScoringSystem = {}));
// Enum para temas visuales
var VisualTheme;
(function (VisualTheme) {
    VisualTheme["DEFAULT"] = "default";
    VisualTheme["DARK"] = "dark";
    VisualTheme["LIGHT"] = "light";
    VisualTheme["COLORFUL"] = "colorful";
    VisualTheme["MINIMAL"] = "minimal";
    VisualTheme["RETRO"] = "retro";
})(VisualTheme || (exports.VisualTheme = VisualTheme = {}));
// Esquema de configuración de la sala
const GameRoomConfigSchema = new mongoose_1.Schema({
    // Configuración básica
    maxPlayers: {
        type: Number,
        required: true,
        min: 2,
        max: 10,
        default: 6,
    },
    roundTime: {
        type: Number,
        required: true,
        min: 30,
        max: 300,
        default: 90,
    },
    totalRounds: {
        type: Number,
        required: true,
        min: 1,
        max: 20,
        default: 3,
    },
    drawingCategories: {
        type: [String],
        required: true,
        default: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    },
    allowCustomWords: {
        type: Boolean,
        default: false,
    },
    customWords: {
        type: [String],
        validate: {
            validator: function (words) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return !this.allowCustomWords || (words && words.length > 0);
            },
            message: 'Se requieren palabras personalizadas cuando allowCustomWords es true',
        },
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    // Nuevas opciones configurables
    gameMode: {
        type: String,
        enum: Object.values(GameMode),
        default: GameMode.STANDARD,
    },
    adaptiveTime: {
        type: Boolean,
        default: false,
    },
    timeFactor: {
        type: Number,
        min: 0.5,
        max: 2,
        default: 1,
        validate: {
            validator: function (factor) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return !this.adaptiveTime || (factor >= 0.5 && factor <= 2);
            },
            message: 'El factor de tiempo debe estar entre 0.5 y 2 cuando adaptiveTime es true',
        },
    },
    scoreMultiplier: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
    },
    scoringSystem: {
        type: String,
        enum: Object.values(ScoringSystem),
        default: ScoringSystem.STANDARD,
    },
    bonusRounds: {
        type: Boolean,
        default: false,
    },
    teamMode: {
        type: Boolean,
        default: false,
    },
    teamsCount: {
        type: Number,
        min: 2,
        max: 4,
        default: 2,
        validate: {
            validator: function (count) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return !this.teamMode || (count >= 2 && count <= 4);
            },
            message: 'El número de equipos debe estar entre 2 y 4 cuando teamMode es true',
        },
    },
    allowVoting: {
        type: Boolean,
        default: true,
    },
    votingThreshold: {
        type: Number,
        min: 50,
        max: 90,
        default: 60,
    },
    allowHints: {
        type: Boolean,
        default: true,
    },
    hintsCount: {
        type: Number,
        min: 0,
        max: 3,
        default: 1,
    },
    visualTheme: {
        type: String,
        enum: Object.values(VisualTheme),
        default: VisualTheme.DEFAULT,
    },
    showTimer: {
        type: Boolean,
        default: true,
    },
    allowSpectators: {
        type: Boolean,
        default: true,
    },
    minPlayersToStart: {
        type: Number,
        min: 2,
        max: 10,
        default: 2,
        validate: {
            validator: function (min) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return min <= this.maxPlayers;
            },
            message: 'El mínimo de jugadores para iniciar no puede ser mayor que el máximo de jugadores',
        },
    },
    autoStart: {
        type: Boolean,
        default: false,
    },
    hideWords: {
        type: Boolean,
        default: true,
    },
    roundBuffer: {
        type: Number,
        min: 3,
        max: 20,
        default: 5,
    },
});
// Esquema principal de sala de juego
const GameRoomSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
    },
    status: {
        type: String,
        required: true,
        enum: Object.values(GameRoomStatus),
        default: GameRoomStatus.WAITING,
    },
    configuration: {
        type: GameRoomConfigSchema,
        required: true,
        default: () => ({}),
    },
    type: {
        type: String,
        required: true,
        enum: Object.values(GameRoomType),
        default: GameRoomType.PUBLIC,
    },
    accessCode: {
        type: String,
        trim: true,
        minlength: 6,
        maxlength: 8,
        // Solo requerido para salas privadas
        validate: {
            validator: function (code) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return this.type !== GameRoomType.PRIVATE || (code && code.length >= 6);
            },
            message: 'Se requiere un código de acceso para salas privadas',
        },
    },
    hostId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    players: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'GamePlayer',
        },
    ],
    currentRound: {
        type: Number,
        default: 0,
    },
    currentDrawingPlayer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'GamePlayer',
    },
    currentWord: {
        type: String,
        select: false, // No incluir por defecto en las consultas (palabra secreta)
    },
    expiresAt: {
        type: Date,
    },
}, {
    timestamps: true,
    // Configurar TTL para limpiar salas inactivas
    // MongoDB automáticamente eliminará documentos después de que expiren
    expireAfterSeconds: 0,
});
// Índices para búsquedas eficientes
GameRoomSchema.index({ status: 1, type: 1 }); // Buscar salas disponibles por estado y tipo
GameRoomSchema.index({ accessCode: 1 }, { sparse: true }); // Buscar salas por código de acceso
GameRoomSchema.index({ hostId: 1 }); // Buscar salas por host
GameRoomSchema.index({ createdAt: 1 }); // Ordenar por fecha de creación
GameRoomSchema.index({ expiresAt: 1 }, { sparse: true }); // Para el TTL de MongoDB
GameRoomSchema.index({ 'configuration.gameMode': 1 }); // Búsqueda por modo de juego
GameRoomSchema.index({ 'configuration.difficulty': 1 }); // Búsqueda por dificultad
// Middleware para generar código aleatorio para salas privadas
GameRoomSchema.pre('save', function (next) {
    if (this.isNew && this.type === GameRoomType.PRIVATE && !this.accessCode) {
        // Generar código aleatorio de 6 caracteres alfanuméricos
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos como 0,O,1,I
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.accessCode = code;
    }
    // Establecer fecha de expiración para las salas inactivas (24 horas por defecto)
    if (this.isNew && !this.expiresAt) {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);
        this.expiresAt = expiryDate;
    }
    next();
});
// Crear y exportar el modelo
exports.GameRoomModel = (0, mongoose_1.model)('GameRoom', GameRoomSchema);
