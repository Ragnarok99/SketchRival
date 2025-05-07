import { Schema, model, Document, Types } from 'mongoose';

// Enum para el rol del jugador en la sala
export enum PlayerRole {
  HOST = 'host', // Anfitrión (creador de la sala)
  PLAYER = 'player', // Jugador normal
  SPECTATOR = 'spectator', // Espectador (no participa activamente)
}

// Enum para el estado del jugador
export enum PlayerStatus {
  WAITING = 'waiting', // Esperando en la sala
  READY = 'ready', // Listo para iniciar
  PLAYING = 'playing', // Jugando activamente
  FINISHED = 'finished', // Terminó su turno/ronda
  DISCONNECTED = 'disconnected', // Desconectado temporalmente
}

// Interfaz para el modelo de jugador
export interface IGamePlayer {
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  role: PlayerRole;
  status: PlayerStatus;
  score: number;
  isConnected: boolean;
  isReady: boolean;
  lastActivity: Date;
  avatarColor: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interfaz para el documento de jugador
export interface IGamePlayerDocument extends IGamePlayer, Document {}

// Esquema para el jugador
const GamePlayerSchema = new Schema<IGamePlayerDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'GameRoom',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(PlayerRole),
      default: PlayerRole.PLAYER,
    },
    status: {
      type: String,
      enum: Object.values(PlayerStatus),
      default: PlayerStatus.WAITING,
    },
    score: {
      type: Number,
      default: 0,
    },
    isConnected: {
      type: Boolean,
      default: true,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    avatarColor: {
      type: String,
      default: function () {
        // Generar un color aleatorio para el avatar
        const colors = [
          '#FF5733',
          '#33FF57',
          '#3357FF',
          '#F3FF33',
          '#FF33F3',
          '#33FFF3',
          '#FF8033',
          '#8033FF',
          '#33FF80',
          '#FF3380',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
  },
  {
    timestamps: true,
  },
);

// Índices para búsquedas eficientes
GamePlayerSchema.index({ roomId: 1, userId: 1 }, { unique: true }); // Índice compuesto único (un usuario solo puede estar una vez en cada sala)
GamePlayerSchema.index({ roomId: 1, score: -1 }); // Para buscar jugadores por puntuación en una sala
GamePlayerSchema.index({ userId: 1 }); // Para buscar todas las salas de un usuario
GamePlayerSchema.index({ lastActivity: 1 }); // Para identificar jugadores inactivos

// Crear y exportar el modelo
export const GamePlayerModel = model<IGamePlayerDocument>('GamePlayer', GamePlayerSchema);
