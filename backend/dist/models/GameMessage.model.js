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
exports.GameMessageModel = exports.MessageType = void 0;
const mongoose_1 = require("mongoose");
// Enumeración para tipos de mensajes
var MessageType;
(function (MessageType) {
    MessageType["NORMAL"] = "normal";
    MessageType["SYSTEM"] = "system";
    MessageType["JOIN"] = "join";
    MessageType["LEAVE"] = "leave";
    MessageType["GAME"] = "game";
    MessageType["PRIVATE"] = "private";
})(MessageType || (exports.MessageType = MessageType = {}));
// Esquema para el mensaje
const GameMessageSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'GameRoom',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    senderName: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: Object.values(MessageType),
        default: MessageType.NORMAL,
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Métodos estáticos para el modelo
GameMessageSchema.statics.createSystemMessage = function (roomId, content) {
    return __awaiter(this, void 0, void 0, function* () {
        return this.create({
            roomId,
            senderName: 'Sistema',
            content,
            type: MessageType.SYSTEM,
        });
    });
};
GameMessageSchema.statics.createJoinMessage = function (roomId, senderId, senderName) {
    return __awaiter(this, void 0, void 0, function* () {
        return this.create({
            roomId,
            senderId,
            senderName,
            content: `${senderName} se ha unido a la sala`,
            type: MessageType.JOIN,
        });
    });
};
GameMessageSchema.statics.createLeaveMessage = function (roomId, senderId, senderName) {
    return __awaiter(this, void 0, void 0, function* () {
        return this.create({
            roomId,
            senderId,
            senderName,
            content: `${senderName} ha abandonado la sala`,
            type: MessageType.LEAVE,
        });
    });
};
// Crear y exportar el modelo
exports.GameMessageModel = (0, mongoose_1.model)('GameMessage', GameMessageSchema);
