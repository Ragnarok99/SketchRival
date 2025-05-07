import { Schema, model, Document, Types } from 'mongoose';

// Enum para el estado de la sala
export enum GameRoomStatus {
  WAITING = 'waiting', // Esperando jugadores
  STARTING = 'starting', // Iniciando juego
  PLAYING = 'playing', // Jugando
  FINISHED = 'finished', // Juego terminado
  CLOSED = 'closed', // Sala cerrada/inactiva
}

// Enum para el tipo de sala
export enum GameRoomType {
  PUBLIC = 'public', // Sala pública (visible en listas)
  PRIVATE = 'private', // Sala privada (acceso solo por código)
}

// Interfaz para la configuración de la sala
export interface GameRoomConfig {
  maxPlayers: number; // Máximo número de jugadores (2-10)
  roundTime: number; // Tiempo por ronda en segundos
  totalRounds: number; // Número total de rondas
  drawingCategories: string[]; // Categorías para dibujar
  allowCustomWords: boolean; // Permitir palabras personalizadas
  customWords?: string[]; // Palabras personalizadas si están permitidas
  difficulty: 'easy' | 'medium' | 'hard'; // Dificultad de las palabras
}

// Usar Document con generic para este tipo específico
export interface IGameRoomDocument extends Document {
  name: string;
  status: GameRoomStatus;
  configuration: GameRoomConfig;
  type: GameRoomType;
  accessCode?: string;
  hostId: Types.ObjectId;
  players: Types.ObjectId[];
  currentRound: number;
  currentDrawingPlayer?: Types.ObjectId;
  currentWord?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// Interfaz para el modelo sin Document
export interface IGameRoom {
  name: string; // Nombre de la sala
  status: GameRoomStatus; // Estado actual
  configuration: GameRoomConfig; // Configuración de la sala
  type: GameRoomType; // Tipo: público o privado
  accessCode?: string; // Código de acceso para salas privadas
  hostId: Types.ObjectId; // ID del usuario que creó la sala (anfitrión)
  players: Types.ObjectId[]; // Referencias a jugadores en la sala
  currentRound: number; // Ronda actual de juego
  currentDrawingPlayer?: Types.ObjectId; // Jugador que está dibujando actualmente
  currentWord?: string; // Palabra actual que se está dibujando
  createdAt: Date; // Fecha de creación
  updatedAt: Date; // Fecha de última actualización
  expiresAt?: Date; // Fecha de expiración (opcional)
}

// Esquema de configuración de la sala
const GameRoomConfigSchema = new Schema<GameRoomConfig>({
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
      validator: function (words: string[]) {
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
});

// Esquema principal de sala de juego
const GameRoomSchema = new Schema<IGameRoomDocument>(
  {
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
        validator: function (code: string) {
          // @ts-ignore: Accediendo a this en un contexto de Mongoose
          return this.type !== GameRoomType.PRIVATE || (code && code.length >= 6);
        },
        message: 'Se requiere un código de acceso para salas privadas',
      },
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: 'GamePlayer',
      },
    ],
    currentRound: {
      type: Number,
      default: 0,
    },
    currentDrawingPlayer: {
      type: Schema.Types.ObjectId,
      ref: 'GamePlayer',
    },
    currentWord: {
      type: String,
      select: false, // No incluir por defecto en las consultas (palabra secreta)
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // Configurar TTL para limpiar salas inactivas
    // MongoDB automáticamente eliminará documentos después de que expiren
    expireAfterSeconds: 0,
  },
);

// Índices para búsquedas eficientes
GameRoomSchema.index({ status: 1, type: 1 }); // Buscar salas disponibles por estado y tipo
GameRoomSchema.index({ accessCode: 1 }, { sparse: true }); // Buscar salas por código de acceso
GameRoomSchema.index({ hostId: 1 }); // Buscar salas por host
GameRoomSchema.index({ createdAt: 1 }); // Ordenar por fecha de creación
GameRoomSchema.index({ expiresAt: 1 }, { sparse: true }); // Para el TTL de MongoDB

// Middleware para generar código aleatorio para salas privadas
GameRoomSchema.pre<IGameRoomDocument>('save', function (next) {
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
export const GameRoomModel = model<IGameRoomDocument>('GameRoom', GameRoomSchema);
