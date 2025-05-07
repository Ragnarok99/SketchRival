import { Schema, model, Types, Document, Model } from 'mongoose';

// Enumeración para tipos de mensajes
export enum MessageType {
  NORMAL = 'normal', // Mensaje normal de usuario
  SYSTEM = 'system', // Mensaje del sistema
  JOIN = 'join', // Mensaje de unión a sala
  LEAVE = 'leave', // Mensaje de abandono de sala
  GAME = 'game', // Mensaje relacionado con el juego
  PRIVATE = 'private', // Mensaje privado
}

// Interfaz para el documento de mensaje
export interface IGameMessage {
  roomId: Types.ObjectId;
  senderId?: Types.ObjectId;
  senderName: string;
  content: string;
  type: MessageType;
  sentAt?: Date;
  isDeleted?: boolean;
  isEdited?: boolean;
}

export interface IGameMessageDocument extends IGameMessage, Document {}

// Interfaz para métodos estáticos del modelo
export interface IGameMessageModel extends Model<IGameMessageDocument> {
  createSystemMessage(roomId: Types.ObjectId, content: string): Promise<IGameMessageDocument>;
  createJoinMessage(
    roomId: Types.ObjectId,
    senderId: Types.ObjectId,
    senderName: string,
  ): Promise<IGameMessageDocument>;
  createLeaveMessage(
    roomId: Types.ObjectId,
    senderId: Types.ObjectId,
    senderName: string,
  ): Promise<IGameMessageDocument>;
}

// Esquema para el mensaje
const GameMessageSchema = new Schema<IGameMessageDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'GameRoom',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  },
);

// Métodos estáticos para el modelo
GameMessageSchema.statics.createSystemMessage = async function (
  roomId: Types.ObjectId,
  content: string,
): Promise<IGameMessageDocument> {
  return this.create({
    roomId,
    senderName: 'Sistema',
    content,
    type: MessageType.SYSTEM,
  });
};

GameMessageSchema.statics.createJoinMessage = async function (
  roomId: Types.ObjectId,
  senderId: Types.ObjectId,
  senderName: string,
): Promise<IGameMessageDocument> {
  return this.create({
    roomId,
    senderId,
    senderName,
    content: `${senderName} se ha unido a la sala`,
    type: MessageType.JOIN,
  });
};

GameMessageSchema.statics.createLeaveMessage = async function (
  roomId: Types.ObjectId,
  senderId: Types.ObjectId,
  senderName: string,
): Promise<IGameMessageDocument> {
  return this.create({
    roomId,
    senderId,
    senderName,
    content: `${senderName} ha abandonado la sala`,
    type: MessageType.LEAVE,
  });
};

// Crear y exportar el modelo
export const GameMessageModel = model<IGameMessageDocument, IGameMessageModel>('GameMessage', GameMessageSchema);
