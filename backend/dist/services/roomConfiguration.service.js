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
exports.AVAILABLE_CATEGORIES = exports.ConfigPreset = exports.CURRENT_CONFIG_VERSION = void 0;
exports.getConfigPreset = getConfigPreset;
exports.createRoomConfig = createRoomConfig;
exports.suggestConfiguration = suggestConfiguration;
exports.validateConfig = validateConfig;
exports.updateRoomConfig = updateRoomConfig;
exports.getAvailableConfigs = getAvailableConfigs;
exports.migrateConfig = migrateConfig;
exports.saveUserFavoriteConfig = saveUserFavoriteConfig;
exports.getUserFavoriteConfigs = getUserFavoriteConfigs;
exports.calculateAdaptiveRoundTime = calculateAdaptiveRoundTime;
const models_1 = require("../models");
const GameRoom_model_1 = require("../models/GameRoom.model");
// Versión actual del esquema de configuración
exports.CURRENT_CONFIG_VERSION = '2.0';
// Configuraciones preestablecidas
var ConfigPreset;
(function (ConfigPreset) {
    ConfigPreset["QUICK"] = "quick";
    ConfigPreset["STANDARD"] = "standard";
    ConfigPreset["EXTENDED"] = "extended";
    ConfigPreset["COMPETITIVE"] = "competitive";
    ConfigPreset["TEAMS"] = "teams";
    ConfigPreset["CASUAL"] = "casual";
    ConfigPreset["EXPERT"] = "expert";
    ConfigPreset["PARTY"] = "party";
    ConfigPreset["CUSTOM"] = "custom";
})(ConfigPreset || (exports.ConfigPreset = ConfigPreset = {}));
// Presets de configuración
const CONFIG_PRESETS = {
    [ConfigPreset.QUICK]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 4,
        roundTime: 45,
        totalRounds: 2,
        drawingCategories: ['animales', 'objetos', 'comida'],
        allowCustomWords: false,
        difficulty: 'easy',
        gameMode: GameRoom_model_1.GameMode.CASUAL,
        adaptiveTime: false,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.STANDARD,
        bonusRounds: false,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 75,
        allowHints: true,
        hintsCount: 1,
        visualTheme: GameRoom_model_1.VisualTheme.DEFAULT,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 2,
        autoStart: true,
        hideWords: true,
        roundBuffer: 3,
    },
    [ConfigPreset.STANDARD]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 6,
        roundTime: 90,
        totalRounds: 4,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
        allowCustomWords: false,
        difficulty: 'medium',
        gameMode: GameRoom_model_1.GameMode.STANDARD,
        adaptiveTime: false,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.STANDARD,
        bonusRounds: false,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 60,
        allowHints: true,
        hintsCount: 1,
        visualTheme: GameRoom_model_1.VisualTheme.DEFAULT,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 2,
        autoStart: false,
        hideWords: true,
        roundBuffer: 5,
    },
    [ConfigPreset.EXTENDED]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 8,
        roundTime: 120,
        totalRounds: 6,
        drawingCategories: [
            'animales',
            'objetos',
            'comida',
            'deportes',
            'países',
            'profesiones',
            'películas',
            'personajes',
        ],
        allowCustomWords: true,
        difficulty: 'hard',
        gameMode: GameRoom_model_1.GameMode.STANDARD,
        adaptiveTime: true,
        timeFactor: 1.2,
        scoreMultiplier: 1.5,
        scoringSystem: GameRoom_model_1.ScoringSystem.PROGRESSIVE,
        bonusRounds: true,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 65,
        allowHints: true,
        hintsCount: 2,
        visualTheme: GameRoom_model_1.VisualTheme.DEFAULT,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 3,
        autoStart: false,
        hideWords: true,
        roundBuffer: 8,
    },
    [ConfigPreset.COMPETITIVE]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 6,
        roundTime: 60,
        totalRounds: 5,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones'],
        allowCustomWords: false,
        difficulty: 'hard',
        gameMode: GameRoom_model_1.GameMode.COMPETITIVE,
        adaptiveTime: false,
        scoreMultiplier: 2,
        scoringSystem: GameRoom_model_1.ScoringSystem.TIMED,
        bonusRounds: true,
        teamMode: false,
        allowVoting: false,
        votingThreshold: 85,
        allowHints: false,
        hintsCount: 0,
        visualTheme: GameRoom_model_1.VisualTheme.MINIMAL,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 4,
        autoStart: false,
        hideWords: true,
        roundBuffer: 5,
    },
    [ConfigPreset.TEAMS]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 8,
        roundTime: 75,
        totalRounds: 6,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones'],
        allowCustomWords: false,
        difficulty: 'medium',
        gameMode: GameRoom_model_1.GameMode.TEAM,
        adaptiveTime: true,
        timeFactor: 1.2,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.STANDARD,
        bonusRounds: false,
        teamMode: true,
        teamsCount: 2,
        allowVoting: true,
        votingThreshold: 60,
        allowHints: true,
        hintsCount: 1,
        visualTheme: GameRoom_model_1.VisualTheme.COLORFUL,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 4,
        autoStart: false,
        hideWords: true,
        roundBuffer: 5,
    },
    [ConfigPreset.CASUAL]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 10,
        roundTime: 120,
        totalRounds: 3,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes'],
        allowCustomWords: true,
        difficulty: 'easy',
        gameMode: GameRoom_model_1.GameMode.CASUAL,
        adaptiveTime: true,
        timeFactor: 1.5,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.STANDARD,
        bonusRounds: false,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 50,
        allowHints: true,
        hintsCount: 3,
        visualTheme: GameRoom_model_1.VisualTheme.COLORFUL,
        showTimer: false,
        allowSpectators: true,
        minPlayersToStart: 2,
        autoStart: true,
        hideWords: true,
        roundBuffer: 10,
    },
    [ConfigPreset.EXPERT]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 6,
        roundTime: 45,
        totalRounds: 8,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países', 'profesiones', 'películas'],
        allowCustomWords: false,
        difficulty: 'hard',
        gameMode: GameRoom_model_1.GameMode.COMPETITIVE,
        adaptiveTime: false,
        scoreMultiplier: 3,
        scoringSystem: GameRoom_model_1.ScoringSystem.COMBO,
        bonusRounds: true,
        teamMode: false,
        allowVoting: false,
        votingThreshold: 90,
        allowHints: false,
        hintsCount: 0,
        visualTheme: GameRoom_model_1.VisualTheme.MINIMAL,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 3,
        autoStart: false,
        hideWords: true,
        roundBuffer: 3,
    },
    [ConfigPreset.PARTY]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 10,
        roundTime: 60,
        totalRounds: 10,
        drawingCategories: [
            'animales',
            'objetos',
            'comida',
            'deportes',
            'países',
            'profesiones',
            'películas',
            'personajes',
        ],
        allowCustomWords: true,
        difficulty: 'medium',
        gameMode: GameRoom_model_1.GameMode.STANDARD,
        adaptiveTime: true,
        timeFactor: 0.8,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.PROGRESSIVE,
        bonusRounds: true,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 60,
        allowHints: true,
        hintsCount: 1,
        visualTheme: GameRoom_model_1.VisualTheme.COLORFUL,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 5,
        autoStart: true,
        hideWords: true,
        roundBuffer: 5,
    },
    [ConfigPreset.CUSTOM]: {
        version: exports.CURRENT_CONFIG_VERSION,
        maxPlayers: 6,
        roundTime: 90,
        totalRounds: 3,
        drawingCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
        allowCustomWords: false,
        difficulty: 'medium',
        gameMode: GameRoom_model_1.GameMode.CUSTOM,
        adaptiveTime: false,
        scoreMultiplier: 1,
        scoringSystem: GameRoom_model_1.ScoringSystem.STANDARD,
        bonusRounds: false,
        teamMode: false,
        allowVoting: true,
        votingThreshold: 60,
        allowHints: true,
        hintsCount: 1,
        visualTheme: GameRoom_model_1.VisualTheme.DEFAULT,
        showTimer: true,
        allowSpectators: true,
        minPlayersToStart: 2,
        autoStart: false,
        hideWords: true,
        roundBuffer: 5,
    },
};
// Categorías de dibujo disponibles
exports.AVAILABLE_CATEGORIES = [
    'animales',
    'objetos',
    'comida',
    'deportes',
    'países',
    'profesiones',
    'películas',
    'personajes',
    'lugares',
    'marcas',
    'vehículos',
    'instrumentos',
    'celebridades',
];
/**
 * Obtiene una configuración preestablecida
 */
function getConfigPreset(preset) {
    const config = CONFIG_PRESETS[preset] || CONFIG_PRESETS[ConfigPreset.STANDARD];
    return Object.assign(Object.assign({}, config), { preset });
}
/**
 * Crea una configuración de sala basada en un preset y overrides opcionales
 */
function createRoomConfig(options = {}) {
    const { preset = ConfigPreset.STANDARD, overrides = {} } = options;
    // Obtener la configuración base del preset
    const baseConfig = getConfigPreset(preset);
    // Aplicar overrides
    const config = Object.assign(Object.assign(Object.assign({}, baseConfig), overrides), { 
        // Asegurar que sigue siendo el preset seleccionado o marcar como custom si hay overrides
        preset: Object.keys(overrides).length > 0 ? ConfigPreset.CUSTOM : preset, 
        // Asegurar que la versión se mantiene
        version: exports.CURRENT_CONFIG_VERSION });
    // Validar la configuración final
    validateConfig(config);
    return config;
}
/**
 * Sugiere una configuración basada en el número de jugadores y tipo de juego
 */
function suggestConfiguration(playerCount, gameType = 'casual') {
    // Base del preset según tipo de juego
    let basePreset;
    if (gameType === 'competitive') {
        basePreset = ConfigPreset.COMPETITIVE;
    }
    else if (gameType === 'teams') {
        basePreset = ConfigPreset.TEAMS;
    }
    else {
        basePreset = ConfigPreset.CASUAL;
    }
    // Obtener configuración base
    const baseConfig = getConfigPreset(basePreset);
    // Ajustar según número de jugadores
    const overrides = {
        maxPlayers: Math.max(playerCount, 2),
        minPlayersToStart: Math.max(Math.ceil(playerCount * 0.7), 2),
    };
    // Ajustes según tamaño del grupo
    if (playerCount > 6) {
        // Para grupos grandes
        overrides.roundTime = gameType === 'competitive' ? 60 : 90;
        overrides.adaptiveTime = true;
        overrides.timeFactor = 0.8; // Menos tiempo por jugador en grupos grandes
    }
    else if (playerCount < 4) {
        // Para grupos pequeños
        overrides.roundTime = gameType === 'competitive' ? 75 : 100;
        overrides.totalRounds = gameType === 'competitive' ? 6 : 4;
    }
    // Ajustes específicos para equipos
    if (gameType === 'teams') {
        overrides.teamMode = true;
        overrides.teamsCount = playerCount >= 6 ? 3 : 2;
    }
    // Crear configuración con los ajustes
    return createRoomConfig({
        preset: basePreset,
        overrides,
    });
}
/**
 * Valida una configuración completa y arroja error si no es válida
 */
function validateConfig(config) {
    const errors = [];
    // Validar número de jugadores
    if (config.maxPlayers !== undefined) {
        if (config.maxPlayers < 2) {
            errors.push('El número mínimo de jugadores debe ser 2');
        }
        else if (config.maxPlayers > 10) {
            errors.push('El número máximo de jugadores debe ser 10');
        }
    }
    // Validar tiempo por ronda
    if (config.roundTime !== undefined) {
        if (config.roundTime < 30) {
            errors.push('El tiempo mínimo por ronda debe ser 30 segundos');
        }
        else if (config.roundTime > 300) {
            errors.push('El tiempo máximo por ronda debe ser 300 segundos (5 minutos)');
        }
    }
    // Validar número de rondas
    if (config.totalRounds !== undefined) {
        if (config.totalRounds < 1) {
            errors.push('El juego debe tener al menos 1 ronda');
        }
        else if (config.totalRounds > 20) {
            errors.push('El juego no puede tener más de 20 rondas');
        }
    }
    // Validar categorías de dibujo
    if (config.drawingCategories !== undefined) {
        if (!Array.isArray(config.drawingCategories) || config.drawingCategories.length === 0) {
            errors.push('Debe seleccionar al menos una categoría de dibujo');
        }
        else {
            // Verificar que todas las categorías son válidas
            const invalidCategories = config.drawingCategories.filter((cat) => !exports.AVAILABLE_CATEGORIES.includes(cat));
            if (invalidCategories.length > 0) {
                errors.push(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
            }
        }
    }
    // Validar palabras personalizadas
    if (config.allowCustomWords === true && config.customWords !== undefined) {
        if (!Array.isArray(config.customWords) || config.customWords.length === 0) {
            errors.push('Debe proporcionar al menos una palabra personalizada cuando allowCustomWords es true');
        }
    }
    // Validar dificultad
    if (config.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
        errors.push('La dificultad debe ser easy, medium o hard');
    }
    // Validar modo de juego
    if (config.gameMode !== undefined && !Object.values(GameRoom_model_1.GameMode).includes(config.gameMode)) {
        errors.push('Modo de juego no válido');
    }
    // Validar sistema de puntuación
    if (config.scoringSystem !== undefined && !Object.values(GameRoom_model_1.ScoringSystem).includes(config.scoringSystem)) {
        errors.push('Sistema de puntuación no válido');
    }
    // Validar tema visual
    if (config.visualTheme !== undefined && !Object.values(GameRoom_model_1.VisualTheme).includes(config.visualTheme)) {
        errors.push('Tema visual no válido');
    }
    // Validar multiplicador de puntuación
    if (config.scoreMultiplier !== undefined) {
        if (config.scoreMultiplier < 1) {
            errors.push('El multiplicador de puntuación mínimo es 1');
        }
        else if (config.scoreMultiplier > 5) {
            errors.push('El multiplicador de puntuación máximo es 5');
        }
    }
    // Validar factor de tiempo
    if (config.adaptiveTime === true && config.timeFactor !== undefined) {
        if (config.timeFactor < 0.5) {
            errors.push('El factor de tiempo mínimo es 0.5');
        }
        else if (config.timeFactor > 2) {
            errors.push('El factor de tiempo máximo es 2');
        }
    }
    // Validar mínimo de jugadores para iniciar
    if (config.minPlayersToStart !== undefined) {
        if (config.minPlayersToStart < 2) {
            errors.push('El mínimo de jugadores para iniciar debe ser al menos 2');
        }
        else if (config.maxPlayers !== undefined && config.minPlayersToStart > config.maxPlayers) {
            errors.push('El mínimo de jugadores para iniciar no puede ser mayor que el máximo de jugadores');
        }
    }
    // Validar umbral de votación
    if (config.votingThreshold !== undefined) {
        if (config.votingThreshold < 50) {
            errors.push('El umbral de votación debe ser al menos 50%');
        }
        else if (config.votingThreshold > 90) {
            errors.push('El umbral de votación no puede ser mayor que 90%');
        }
    }
    // Validar número de pistas
    if (config.hintsCount !== undefined) {
        if (config.hintsCount < 0) {
            errors.push('El número de pistas no puede ser negativo');
        }
        else if (config.hintsCount > 3) {
            errors.push('El número máximo de pistas es 3');
        }
    }
    // Validar buffer entre rondas
    if (config.roundBuffer !== undefined) {
        if (config.roundBuffer < 3) {
            errors.push('El tiempo entre rondas debe ser al menos 3 segundos');
        }
        else if (config.roundBuffer > 20) {
            errors.push('El tiempo entre rondas no puede ser mayor que 20 segundos');
        }
    }
    // Validaciones de modo por equipos
    if (config.teamMode === true) {
        if (config.teamsCount !== undefined) {
            if (config.teamsCount < 2) {
                errors.push('El número mínimo de equipos es 2');
            }
            else if (config.teamsCount > 4) {
                errors.push('El número máximo de equipos es 4');
            }
        }
        // Verificar si hay suficientes jugadores para el modo equipos
        if (config.maxPlayers !== undefined && config.maxPlayers < 4) {
            errors.push('El modo por equipos requiere al menos 4 jugadores máximos');
        }
        if (config.minPlayersToStart !== undefined && config.minPlayersToStart < 4) {
            errors.push('El modo por equipos requiere al menos 4 jugadores para iniciar');
        }
    }
    // Validar compatibilidad entre opciones
    if (config.difficulty === 'hard' && config.roundTime !== undefined && config.roundTime < 60) {
        errors.push('Para dificultad "hard", el tiempo mínimo por ronda debe ser 60 segundos');
    }
    // Validar que las pistas están desactivadas si no se permiten
    if (config.allowHints === false && config.hintsCount !== undefined && config.hintsCount > 0) {
        errors.push('El número de pistas debe ser 0 cuando allowHints es false');
    }
    // Si el modo es competitivo, validar configuraciones adecuadas
    if (config.gameMode === GameRoom_model_1.GameMode.COMPETITIVE) {
        if (config.difficulty === 'easy') {
            errors.push('En modo competitivo, la dificultad mínima debe ser "medium"');
        }
        if (config.scoreMultiplier !== undefined && config.scoreMultiplier < 1.5) {
            errors.push('En modo competitivo, el multiplicador de puntuación debe ser al menos 1.5');
        }
    }
    // Si hay errores, lanzar excepción
    if (errors.length > 0) {
        throw new Error(`Configuración inválida: ${errors.join('. ')}`);
    }
}
/**
 * Actualiza la configuración de una sala existente
 */
function updateRoomConfig(roomId, config) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validar configuración parcial
        validateConfig(config);
        // Obtener la sala
        const room = yield models_1.GameRoomModel.findById(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        // Solo se puede modificar la configuración si la sala está en espera
        if (room.status !== 'waiting') {
            throw new Error('No se puede modificar la configuración de una sala que ya ha comenzado');
        }
        // Convertir la configuración actual a un objeto simple
        const currentConfig = room.configuration;
        // Actualizar configuración
        const updatedRoom = yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
            $set: {
                configuration: Object.assign(Object.assign(Object.assign({}, currentConfig), config), { 
                    // Siempre que se modifica, se marca como preset custom
                    preset: ConfigPreset.CUSTOM, 
                    // El modo de juego será custom si se hacen modificaciones
                    gameMode: GameRoom_model_1.GameMode.CUSTOM, 
                    // Actualizar a versión actual
                    version: exports.CURRENT_CONFIG_VERSION }),
            },
        }, { new: true });
        if (!updatedRoom) {
            throw new Error('Error al actualizar la configuración');
        }
        return updatedRoom.configuration;
    });
}
/**
 * Obtiene las configuraciones por defecto y disponibles
 */
function getAvailableConfigs() {
    return {
        presets: CONFIG_PRESETS,
        categories: exports.AVAILABLE_CATEGORIES,
        currentVersion: exports.CURRENT_CONFIG_VERSION,
        gameModes: Object.values(GameRoom_model_1.GameMode),
        scoringSystems: Object.values(GameRoom_model_1.ScoringSystem),
        visualThemes: Object.values(GameRoom_model_1.VisualTheme),
    };
}
// Mantener para compatibilidad con versiones anteriores
function migrateConfig(config) {
    // Si no hay versión o es la actual, no es necesario migrar
    if (!config.version || config.version === exports.CURRENT_CONFIG_VERSION) {
        return Object.assign(Object.assign({}, config), { version: exports.CURRENT_CONFIG_VERSION });
    }
    // Migración de versiones anteriores a la actual
    const migrated = Object.assign(Object.assign({}, config), { version: exports.CURRENT_CONFIG_VERSION });
    // Versión 1.0 -> 2.0
    if (config.version === '1.0') {
        // Establecer valores por defecto para los nuevos campos
        migrated.gameMode = GameRoom_model_1.GameMode.STANDARD;
        migrated.adaptiveTime = false;
        migrated.scoreMultiplier = 1;
        migrated.scoringSystem = GameRoom_model_1.ScoringSystem.STANDARD;
        migrated.bonusRounds = false;
        migrated.teamMode = false;
        migrated.allowVoting = true;
        migrated.votingThreshold = 60;
        migrated.allowHints = true;
        migrated.hintsCount = 1;
        migrated.visualTheme = GameRoom_model_1.VisualTheme.DEFAULT;
        migrated.showTimer = true;
        migrated.allowSpectators = true;
        migrated.minPlayersToStart = 2;
        migrated.autoStart = false;
        migrated.hideWords = true;
        migrated.roundBuffer = 5;
    }
    return migrated;
}
// Nueva función para guardar configuración favorita de un usuario
function saveUserFavoriteConfig(userId, config, name) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validar la configuración
        validateConfig(config);
        // Aquí iría la lógica para almacenar la configuración en una colección
        // específica de configuraciones favoritas. Por ahora retornamos un mock.
        return {
            id: `favorite-${Date.now()}`,
            name,
        };
    });
}
// Nueva función para obtener configuraciones favoritas de un usuario
function getUserFavoriteConfigs(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Aquí iría la lógica para recuperar configuraciones favoritas del usuario
        // Por ahora retornamos datos de ejemplo
        return [
            {
                id: 'favorite-1',
                name: 'Mi config favorita',
                config: CONFIG_PRESETS[ConfigPreset.STANDARD],
            },
        ];
    });
}
// Nueva función para calcular tiempo por ronda basado en número de jugadores
function calculateAdaptiveRoundTime(baseTime, playerCount, timeFactor = 1) {
    // Fórmula simple: tiempo base + ajuste por cada jugador adicional más allá de 4
    const additionalTime = playerCount > 4 ? (playerCount - 4) * 10 * timeFactor : 0;
    // Limitar al rango permitido de 30-300 segundos
    return Math.max(30, Math.min(300, baseTime + additionalTime));
}
