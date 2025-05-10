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
exports.calculateAdaptiveTime = exports.getFavoriteConfigs = exports.saveFavoriteConfig = exports.suggestConfig = exports.validateConfig = exports.updateRoomConfig = exports.createRoomWithConfig = exports.getConfigPreset = exports.getAvailableConfigs = void 0;
const roomConfigService = __importStar(require("../services/roomConfiguration.service"));
const gameRoomsService = __importStar(require("../services/gameRooms.service"));
const models_1 = require("../models");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Obtener configuraciones disponibles
 */
const getAvailableConfigs = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const configs = roomConfigService.getAvailableConfigs();
        return res.status(200).json(configs);
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener configuraciones' });
    }
});
exports.getAvailableConfigs = getAvailableConfigs;
/**
 * Obtener configuración preestablecida
 */
const getConfigPreset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { preset } = req.params;
        if (!Object.values(roomConfigService.ConfigPreset).includes(preset)) {
            return res.status(400).json({ message: 'Preset de configuración inválido' });
        }
        const config = roomConfigService.getConfigPreset(preset);
        return res.status(200).json(config);
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener preset de configuración' });
    }
});
exports.getConfigPreset = getConfigPreset;
/**
 * Crear configuración para una sala
 */
const createRoomWithConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { name, type, preset, configuration: configOverrides } = req.body;
        const userId = req.user.userId;
        // Crear configuración basada en preset y overrides
        const configuration = roomConfigService.createRoomConfig({
            preset: preset,
            overrides: configOverrides,
        });
        // Crear sala con la configuración
        const room = yield gameRoomsService.createRoom({
            name,
            hostId: userId,
            type,
            configuration,
        });
        return res.status(201).json({
            message: 'Sala creada exitosamente con configuración personalizada',
            room,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al crear sala con configuración' });
    }
});
exports.createRoomWithConfig = createRoomWithConfig;
/**
 * Actualizar configuración de una sala existente
 */
const updateRoomConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        const { configuration, preset } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        // Verificar que el usuario es el anfitrión de la sala
        const room = yield models_1.GameRoomModel.findById(id);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        if (room.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Solo el anfitrión puede modificar la configuración' });
        }
        let newConfig;
        // Si se proporciona un preset, crear configuración basada en preset
        if (preset) {
            newConfig = roomConfigService.createRoomConfig({
                preset: preset,
                overrides: configuration || {},
            });
        }
        else {
            // Si no hay preset, actualizar la configuración existente
            newConfig = yield roomConfigService.updateRoomConfig(id, configuration);
        }
        return res.status(200).json({
            message: 'Configuración actualizada exitosamente',
            configuration: newConfig,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al actualizar configuración' });
    }
});
exports.updateRoomConfig = updateRoomConfig;
/**
 * Validar configuración (sin guardar cambios)
 */
const validateConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { configuration } = req.body;
        if (!configuration) {
            return res.status(400).json({ message: 'Se requiere una configuración para validar' });
        }
        // Intentar validar la configuración
        roomConfigService.validateConfig(configuration);
        return res.status(200).json({
            valid: true,
            message: 'La configuración es válida',
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(422).json({
                valid: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            valid: false,
            message: 'Error desconocido al validar configuración',
        });
    }
});
exports.validateConfig = validateConfig;
/**
 * Sugerir configuración basada en número de jugadores y tipo
 */
const suggestConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { players, gameType } = req.query;
        // Validar parámetros
        const playerCount = players ? parseInt(players, 10) : 4;
        if (isNaN(playerCount) || playerCount < 2 || playerCount > 10) {
            return res.status(400).json({ message: 'Número de jugadores debe estar entre 2 y 10' });
        }
        // Validar tipo de juego
        const validGameTypes = ['casual', 'competitive', 'teams'];
        const type = gameType && validGameTypes.includes(gameType)
            ? gameType
            : 'casual';
        // Obtener configuración sugerida
        const suggestedConfig = roomConfigService.suggestConfiguration(playerCount, type);
        return res.status(200).json({
            message: `Configuración sugerida para ${playerCount} jugadores en modo ${type}`,
            configuration: suggestedConfig,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al sugerir configuración' });
    }
});
exports.suggestConfig = suggestConfig;
/**
 * Guardar configuración favorita para un usuario
 */
const saveFavoriteConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        const { configuration, name } = req.body;
        // Validar datos requeridos
        if (!configuration) {
            return res.status(400).json({ message: 'Se requiere una configuración para guardar' });
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Se requiere un nombre para la configuración favorita' });
        }
        // Validar la configuración
        roomConfigService.validateConfig(configuration);
        // Guardar configuración favorita
        const result = yield roomConfigService.saveUserFavoriteConfig(userId, configuration, name);
        return res.status(201).json({
            message: 'Configuración guardada como favorita',
            id: result.id,
            name: result.name,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al guardar configuración favorita' });
    }
});
exports.saveFavoriteConfig = saveFavoriteConfig;
/**
 * Obtener configuraciones favoritas de un usuario
 */
const getFavoriteConfigs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        // Obtener configuraciones favoritas
        const favorites = yield roomConfigService.getUserFavoriteConfigs(userId);
        return res.status(200).json({
            message: 'Configuraciones favoritas recuperadas',
            favorites,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener configuraciones favoritas' });
    }
});
exports.getFavoriteConfigs = getFavoriteConfigs;
/**
 * Calcular tiempo adaptativo basado en número de jugadores
 */
const calculateAdaptiveTime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseTime, players, factor } = req.query;
        // Validar parámetros
        const baseTimeValue = baseTime ? parseInt(baseTime, 10) : 90;
        const playerCount = players ? parseInt(players, 10) : 4;
        const timeFactor = factor ? parseFloat(factor) : 1;
        if (isNaN(baseTimeValue) || baseTimeValue < 30 || baseTimeValue > 300) {
            return res.status(400).json({ message: 'Tiempo base debe estar entre 30 y 300 segundos' });
        }
        if (isNaN(playerCount) || playerCount < 2 || playerCount > 10) {
            return res.status(400).json({ message: 'Número de jugadores debe estar entre 2 y 10' });
        }
        if (isNaN(timeFactor) || timeFactor < 0.5 || timeFactor > 2) {
            return res.status(400).json({ message: 'Factor de tiempo debe estar entre 0.5 y 2' });
        }
        // Calcular tiempo adaptativo
        const adaptiveTime = roomConfigService.calculateAdaptiveRoundTime(baseTimeValue, playerCount, timeFactor);
        return res.status(200).json({
            baseTime: baseTimeValue,
            playerCount,
            timeFactor,
            adaptiveTime,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al calcular tiempo adaptativo' });
    }
});
exports.calculateAdaptiveTime = calculateAdaptiveTime;
