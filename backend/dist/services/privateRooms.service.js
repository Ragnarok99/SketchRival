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
exports.DEFAULT_CODE_EXPIRY_HOURS = void 0;
exports.generateAccessCode = generateAccessCode;
exports.regenerateAccessCode = regenerateAccessCode;
exports.validateAccessCode = validateAccessCode;
exports.toggleRoomVisibility = toggleRoomVisibility;
exports.createRoomInvitation = createRoomInvitation;
exports.validateInvitation = validateInvitation;
exports.getUserPrivateRooms = getUserPrivateRooms;
exports.cleanupExpiredInvitations = cleanupExpiredInvitations;
exports.getRoomInvitations = getRoomInvitations;
exports.findRoomByAccessCode = findRoomByAccessCode;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const crypto_1 = __importDefault(require("crypto"));
// Duración predeterminada de códigos de acceso (24 horas)
exports.DEFAULT_CODE_EXPIRY_HOURS = 24;
// Para almacenar las invitaciones (en memoria para esta implementación)
// En producción, usaríamos una colección en la base de datos
const invitations = [];
/**
 * Genera un código de acceso único para salas privadas
 * El código será alfanumérico, fácil de leer (sin caracteres confusos) y de longitud fija
 */
function generateAccessCode(length = 6) {
    // Caracteres seguros (sin I/1, O/0 para evitar confusiones)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    // Generar código aleatorio
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars.charAt(randomIndex);
    }
    return code;
}
/**
 * Regenera el código de acceso para una sala privada
 * Solo el anfitrión puede regenerar el código
 */
function regenerateAccessCode(roomId, hostId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verificar que la sala existe y es del tipo correcto
        const room = yield models_1.GameRoomModel.findById(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        // Solo el anfitrión puede regenerar el código
        if (room.hostId.toString() !== hostId) {
            throw new Error('Solo el anfitrión puede regenerar el código de acceso');
        }
        // Solo se puede regenerar el código de salas privadas
        if (room.type !== models_1.GameRoomType.PRIVATE) {
            throw new Error('Solo las salas privadas pueden tener códigos de acceso');
        }
        // Generar nuevo código
        const newCode = generateAccessCode();
        // Establecer nueva fecha de expiración
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + exports.DEFAULT_CODE_EXPIRY_HOURS);
        // Actualizar sala con nuevo código y fecha de expiración
        yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
            $set: {
                accessCode: newCode,
                expiresAt: expiryDate,
            },
        });
        return newCode;
    });
}
/**
 * Valida un código de acceso para una sala privada
 */
function validateAccessCode(roomId, code) {
    return __awaiter(this, void 0, void 0, function* () {
        const room = yield models_1.GameRoomModel.findById(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        // Verificar que la sala es privada
        if (room.type !== models_1.GameRoomType.PRIVATE) {
            throw new Error('Solo las salas privadas requieren código de acceso');
        }
        // Verificar que el código coincide
        if (room.accessCode !== code) {
            return false;
        }
        // Verificar que la sala no ha expirado
        if (room.expiresAt && room.expiresAt < new Date()) {
            return false;
        }
        return true;
    });
}
/**
 * Cambia el tipo de sala entre pública y privada
 */
function toggleRoomVisibility(roomId, hostId, makePrivate) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verificar que la sala existe
        const room = yield models_1.GameRoomModel.findById(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        // Solo el anfitrión puede cambiar la visibilidad
        if (room.hostId.toString() !== hostId) {
            throw new Error('Solo el anfitrión puede cambiar la visibilidad de la sala');
        }
        // Determinar el nuevo tipo
        const newType = makePrivate ? models_1.GameRoomType.PRIVATE : models_1.GameRoomType.PUBLIC;
        // Si se está cambiando a privada, generar código
        let accessCode;
        if (makePrivate) {
            accessCode = generateAccessCode();
        }
        // Actualizar sala
        const updatedRoom = yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
            $set: {
                type: newType,
                accessCode: makePrivate ? accessCode : null,
            },
        }, { new: true });
        if (!updatedRoom) {
            throw new Error('Error al actualizar la sala');
        }
        return {
            type: updatedRoom.type,
            accessCode: updatedRoom.accessCode,
        };
    });
}
/**
 * Crea una invitación para una sala privada
 */
function createRoomInvitation(roomId_1, invitedEmail_1, invitedUserId_1, invitedByUserId_1) {
    return __awaiter(this, arguments, void 0, function* (roomId, invitedEmail, invitedUserId, invitedByUserId, expiryHours = 24) {
        // Verificar que la sala existe y es privada
        const room = yield models_1.GameRoomModel.findById(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        if (room.type !== models_1.GameRoomType.PRIVATE) {
            throw new Error('Solo se pueden crear invitaciones para salas privadas');
        }
        // Verificar permisos (solo el anfitrión o jugadores de la sala pueden invitar)
        const isHost = room.hostId.toString() === invitedByUserId;
        const isPlayer = room.players.some((p) => p.toString() === invitedByUserId);
        if (!isHost && !isPlayer) {
            throw new Error('No tienes permisos para invitar a otros usuarios a esta sala');
        }
        // Generar token de invitación
        const token = crypto_1.default.randomBytes(32).toString('hex');
        // Establecer fecha de expiración
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
        // Crear invitación
        const invitation = {
            roomId,
            invitedEmail,
            invitedUserId,
            invitedByUserId,
            token,
            expiresAt,
            used: false,
        };
        // Almacenar invitación (en producción, se guardaría en la base de datos)
        invitations.push(invitation);
        return invitation;
    });
}
/**
 * Valida un token de invitación y marca como utilizado
 */
function validateInvitation(token) {
    // Buscar invitación por token
    const invitationIndex = invitations.findIndex((inv) => inv.token === token && !inv.used);
    if (invitationIndex === -1) {
        return null;
    }
    const invitation = invitations[invitationIndex];
    // Verificar que no ha expirado
    if (invitation.expiresAt < new Date()) {
        return null;
    }
    // Marcar como utilizada
    invitations[invitationIndex].used = true;
    return invitation;
}
/**
 * Obtiene todas las salas privadas creadas por un usuario
 */
function getUserPrivateRooms(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return models_1.GameRoomModel.find({
            hostId: new mongoose_1.Types.ObjectId(userId),
            type: models_1.GameRoomType.PRIVATE,
        }).sort({ createdAt: -1 });
    });
}
/**
 * Limpia invitaciones expiradas (para mantenimiento)
 */
function cleanupExpiredInvitations() {
    const now = new Date();
    const initialCount = invitations.length;
    // Filtrar invitaciones no expiradas
    const validInvitations = invitations.filter((inv) => inv.expiresAt > now || inv.used);
    // Reemplazar array con invitaciones válidas
    invitations.length = 0;
    invitations.push(...validInvitations);
    return initialCount - invitations.length;
}
/**
 * Lista invitaciones activas para una sala
 */
function getRoomInvitations(roomId) {
    return invitations.filter((inv) => inv.roomId === roomId && !inv.used && inv.expiresAt > new Date());
}
/**
 * Busca una sala por código de acceso
 */
function findRoomByAccessCode(code) {
    return __awaiter(this, void 0, void 0, function* () {
        return models_1.GameRoomModel.findOne({
            accessCode: code,
            type: models_1.GameRoomType.PRIVATE,
            status: { $ne: models_1.GameRoomStatus.CLOSED }, // No incluir salas cerradas
            expiresAt: { $gt: new Date() }, // No incluir salas expiradas
        });
    });
}
