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
const models_1 = require("../models");
const gameRoomService = {
    /**
     * Obtener una sala por su ID
     */
    getRoomById(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const room = yield models_1.GameRoomModel.findById(roomId)
                    .populate('players')
                    .populate('hostId', 'username avatar')
                    .populate('currentGame');
                return room;
            }
            catch (error) {
                console.error('Error getting room by id:', error);
                throw error;
            }
        });
    },
    /**
     * Crear una nueva sala
     */
    createRoom(hostId, roomData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const room = new models_1.GameRoomModel({
                    name: roomData.name,
                    description: roomData.description,
                    hostId,
                    maxPlayers: roomData.maxPlayers || 8,
                    isPrivate: roomData.isPrivate || false,
                    password: roomData.password,
                    config: roomData.configId,
                    players: [hostId],
                    status: 'waiting',
                });
                yield room.save();
                return room;
            }
            catch (error) {
                console.error('Error creating room:', error);
                throw error;
            }
        });
    },
    /**
     * Obtener salas disponibles
     */
    getAvailableRooms() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const rooms = yield models_1.GameRoomModel.find({
                    status: 'waiting',
                    isPrivate: false,
                })
                    .populate('hostId', 'username avatar')
                    .populate('players', 'username avatar')
                    .populate('config')
                    .select('-password');
                return rooms;
            }
            catch (error) {
                console.error('Error getting available rooms:', error);
                throw error;
            }
        });
    },
    /**
     * Verificar si un jugador puede unirse a una sala
     */
    canJoinRoom(roomId, playerId, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const room = yield this.getRoomById(roomId);
                if (!room) {
                    return { canJoin: false, message: 'Sala no encontrada' };
                }
                // Verificar estado de la sala
                if (room.status !== 'waiting') {
                    return { canJoin: false, message: 'La sala ya no está disponible' };
                }
                // Verificar si el jugador ya está en la sala
                const playerIds = room.players.map((p) => p.toString());
                if (playerIds.includes(playerId)) {
                    return { canJoin: true, message: 'Ya estás en esta sala' };
                }
                // Verificar límite de jugadores
                if (room.players.length >= room.maxPlayers) {
                    return { canJoin: false, message: 'La sala está llena' };
                }
                // Verificar contraseña si es privada
                if (room.isPrivate && room.password !== password) {
                    return { canJoin: false, message: 'Contraseña incorrecta' };
                }
                return { canJoin: true };
            }
            catch (error) {
                console.error('Error checking join room:', error);
                throw error;
            }
        });
    },
};
exports.default = gameRoomService;
