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
exports.regenerateAccessCode = exports.changeRoomType = exports.findRoomByCode = exports.validateAccessCode = exports.closeRoom = exports.leaveRoom = exports.joinRoom = exports.updateRoom = exports.getRoomDetails = exports.listRooms = exports.createRoom = void 0;
const gameRoomsService = __importStar(require("../services/gameRooms.service"));
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
// Crear una nueva sala
const createRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { name, type, configuration, accessCode } = req.body;
        const userId = req.user.userId;
        // Verificar si se está creando una sala privada sin código
        if (type === models_1.GameRoomType.PRIVATE && !accessCode) {
            // El middleware pre-save generará uno automáticamente
            console.log('Creando sala privada con código autogenerado');
        }
        const room = yield gameRoomsService.createRoom({
            name,
            type,
            configuration,
            hostId: userId,
            accessCode,
        });
        return res.status(201).json({
            message: 'Sala creada exitosamente',
            room,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al crear la sala' });
    }
});
exports.createRoom = createRoom;
// Listar salas (con filtros opcionales)
const listRooms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, type, filter, limit, page } = req.query;
        const filters = {
            // Por defecto, solo listar salas públicas en estado "waiting"
            type: type || 'public',
            status: status || 'waiting',
            limit: limit ? parseInt(limit) : 20,
            page: page ? parseInt(page) : 1,
        };
        // Añadir filtro de búsqueda si existe
        if (filter && typeof filter === 'string') {
            filters.filter = filter;
        }
        const rooms = yield gameRoomsService.listRooms(filters);
        return res.status(200).json(rooms);
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al listar salas' });
    }
});
exports.listRooms = listRooms;
// Obtener detalles de una sala específica
const getRoomDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        const roomDetails = yield gameRoomsService.getRoomDetails(id);
        return res.status(200).json(roomDetails);
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al obtener detalles de la sala' });
    }
});
exports.getRoomDetails = getRoomDetails;
// Actualizar configuración de una sala
const updateRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        const updates = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        const updatedRoom = yield gameRoomsService.updateRoom(Object.assign({ roomId: id, hostId: userId }, updates));
        return res.status(200).json({
            message: 'Sala actualizada exitosamente',
            room: updatedRoom,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al actualizar la sala' });
    }
});
exports.updateRoom = updateRoom;
// Unirse a una sala
const joinRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { accessCode } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        // Validar acceso a sala privada si es necesario
        try {
            yield gameRoomsService.validateRoomAccessCode(id, accessCode);
        }
        catch (error) {
            if (error instanceof Error) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(403).json({ message: 'Error de validación de acceso' });
        }
        const player = yield gameRoomsService.addUserToRoom({
            roomId: id,
            userId,
            username,
            role: undefined, // Usar rol por defecto
        });
        return res.status(200).json({
            message: 'Te has unido a la sala exitosamente',
            player,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al unirse a la sala' });
    }
});
exports.joinRoom = joinRoom;
// Abandonar una sala
const leaveRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        const username = req.user.username;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        yield gameRoomsService.leaveRoom(id, userId, username);
        return res.status(200).json({
            message: 'Has abandonado la sala exitosamente',
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al abandonar la sala' });
    }
});
exports.leaveRoom = leaveRoom;
// Cerrar/eliminar una sala
const closeRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        yield gameRoomsService.closeRoom(id, userId);
        return res.status(200).json({
            message: 'Sala cerrada exitosamente',
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al cerrar la sala' });
    }
});
exports.closeRoom = closeRoom;
/**
 * Validar código de acceso sin unirse a la sala
 */
const validateAccessCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { accessCode } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        if (!accessCode) {
            return res.status(400).json({ message: 'Se requiere código de acceso' });
        }
        // Obtener IP del cliente para limitar intentos
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        try {
            const room = yield gameRoomsService.validateRoomAccessCode(id, accessCode, ipAddress);
            return res.status(200).json({
                valid: true,
                message: 'Código de acceso válido',
                roomName: room.name,
                playersCount: room.players.length,
                maxPlayers: room.configuration.maxPlayers,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                return res.status(403).json({
                    valid: false,
                    message: error.message,
                });
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al validar código' });
    }
});
exports.validateAccessCode = validateAccessCode;
/**
 * Buscar sala por código de acceso
 */
const findRoomByCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        if (!code || code.length !== 6) {
            return res.status(400).json({ message: 'Código de sala inválido' });
        }
        try {
            const room = yield gameRoomsService.findRoomByAccessCode(code);
            return res.status(200).json({
                found: true,
                roomId: room._id,
                roomName: room.name,
                playersCount: room.players.length,
                maxPlayers: room.configuration.maxPlayers,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                return res.status(404).json({
                    found: false,
                    message: error.message,
                });
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al buscar sala' });
    }
});
exports.findRoomByCode = findRoomByCode;
/**
 * Cambiar el tipo de una sala (pública/privada)
 */
const changeRoomType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { type, accessCode } = req.body;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        if (!type || !Object.values(models_1.GameRoomType).includes(type)) {
            return res.status(400).json({ message: 'Tipo de sala inválido' });
        }
        // Si cambiamos a privada, verificar que el código no esté en uso
        if (type === models_1.GameRoomType.PRIVATE && accessCode) {
            const isInUse = yield gameRoomsService.isAccessCodeInUse(accessCode);
            if (isInUse) {
                return res.status(400).json({ message: 'El código de acceso ya está en uso' });
            }
        }
        const updatedRoom = yield gameRoomsService.changeRoomType(id, userId, type, accessCode);
        return res.status(200).json({
            message: `Sala cambiada a ${type === models_1.GameRoomType.PRIVATE ? 'privada' : 'pública'} exitosamente`,
            room: updatedRoom,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al cambiar tipo de sala' });
    }
});
exports.changeRoomType = changeRoomType;
/**
 * Regenerar código de acceso para una sala privada
 */
const regenerateAccessCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        try {
            const room = yield gameRoomsService.regenerateAccessCode(id, userId);
            return res.status(200).json({
                success: true,
                message: 'Código de acceso regenerado exitosamente',
                accessCode: room.accessCode,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                });
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al regenerar código de acceso' });
    }
});
exports.regenerateAccessCode = regenerateAccessCode;
