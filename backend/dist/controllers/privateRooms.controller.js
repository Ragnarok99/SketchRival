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
exports.getUserPrivateRooms = exports.findRoomByCode = exports.acceptInvitation = exports.listInvitations = exports.createInvitation = exports.toggleRoomVisibility = exports.regenerateAccessCode = void 0;
const privateRoomsService = __importStar(require("../services/privateRooms.service"));
const gameRoomsService = __importStar(require("../services/gameRooms.service"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Genera un nuevo código de acceso para una sala privada
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
        const newCode = yield privateRoomsService.regenerateAccessCode(id, userId);
        return res.status(200).json({
            message: 'Código de acceso regenerado exitosamente',
            accessCode: newCode,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al regenerar código de acceso' });
    }
});
exports.regenerateAccessCode = regenerateAccessCode;
/**
 * Cambia la visibilidad de una sala (pública/privada)
 */
const toggleRoomVisibility = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { makePrivate } = req.body;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        if (typeof makePrivate !== 'boolean') {
            return res.status(400).json({ message: 'El parámetro makePrivate debe ser un booleano' });
        }
        const result = yield privateRoomsService.toggleRoomVisibility(id, userId, makePrivate);
        return res.status(200).json({
            message: `Sala cambiada a ${makePrivate ? 'privada' : 'pública'} exitosamente`,
            type: result.type,
            accessCode: result.accessCode,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al cambiar visibilidad de sala' });
    }
});
exports.toggleRoomVisibility = toggleRoomVisibility;
/**
 * Crea una nueva invitación para una sala privada
 */
const createInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { email, userId: invitedUserId, expiryHours } = req.body;
        const invitedByUserId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        if (!email) {
            return res.status(400).json({ message: 'El email del invitado es requerido' });
        }
        const invitation = yield privateRoomsService.createRoomInvitation(id, email, invitedUserId, invitedByUserId, expiryHours);
        // TODO: Enviar email con invitación
        return res.status(201).json({
            message: 'Invitación creada exitosamente',
            invitation: {
                roomId: invitation.roomId,
                email: invitation.invitedEmail,
                token: invitation.token,
                expiresAt: invitation.expiresAt,
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al crear invitación' });
    }
});
exports.createInvitation = createInvitation;
/**
 * Lista invitaciones activas para una sala
 */
const listInvitations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de sala inválido' });
        }
        const invitations = privateRoomsService.getRoomInvitations(id);
        return res.status(200).json({
            invitations: invitations.map((inv) => ({
                email: inv.invitedEmail,
                expiresAt: inv.expiresAt,
                token: inv.token.substring(0, 8) + '...',
            })),
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al listar invitaciones' });
    }
});
exports.listInvitations = listInvitations;
/**
 * Acepta una invitación usando un token
 */
const acceptInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const { token } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;
        if (!token) {
            return res.status(400).json({ message: 'Token de invitación requerido' });
        }
        // Validar invitación
        const invitation = privateRoomsService.validateInvitation(token);
        if (!invitation) {
            return res.status(400).json({ message: 'Invitación inválida o expirada' });
        }
        // Unir usuario a la sala
        const player = yield gameRoomsService.addUserToRoom({
            roomId: invitation.roomId,
            userId,
            username,
        });
        return res.status(200).json({
            message: 'Te has unido a la sala exitosamente',
            roomId: invitation.roomId,
            player,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al aceptar invitación' });
    }
});
exports.acceptInvitation = acceptInvitation;
/**
 * Busca una sala por código de acceso
 */
const findRoomByCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        if (!code || code.length < 6) {
            return res.status(400).json({ message: 'Código de acceso inválido' });
        }
        const room = yield privateRoomsService.findRoomByAccessCode(code);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada con ese código' });
        }
        return res.status(200).json({
            roomId: room._id,
            name: room.name,
            players: room.players.length,
            maxPlayers: room.configuration.maxPlayers,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al buscar sala por código' });
    }
});
exports.findRoomByCode = findRoomByCode;
/**
 * Lista las salas privadas del usuario
 */
const getUserPrivateRooms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        const rooms = yield privateRoomsService.getUserPrivateRooms(userId);
        return res.status(200).json({
            rooms: rooms.map((room) => ({
                id: room._id,
                name: room.name,
                accessCode: room.accessCode,
                players: room.players.length,
                maxPlayers: room.configuration.maxPlayers,
                createdAt: room.createdAt,
                expiresAt: room.expiresAt,
            })),
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido al listar salas privadas' });
    }
});
exports.getUserPrivateRooms = getUserPrivateRooms;
