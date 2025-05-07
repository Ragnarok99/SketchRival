import { Schema, model, Document, Types } from 'mongoose';

// Enumeración para los estados del juego
export enum GameState {
  // Estados principales del juego
  WAITING = 'waiting', // Sala de espera antes de iniciar
  STARTING = 'starting', // Iniciando juego (countdown)
  WORD_SELECTION = 'wordSelection', // Selección de palabra para dibujar
  DRAWING = 'drawing', // Dibujando
  GUESSING = 'guessing', // Adivinando lo que se dibuja
  ROUND_END = 'roundEnd', // Fin de ronda, muestra resultados
  GAME_END = 'gameEnd', // Fin del juego, resultados finales

  // Estados auxiliares
  PAUSED = 'paused', // Juego pausado
  ERROR = 'error', // Error en el juego
}

// Enumeración para los eventos que provocan transiciones
export enum GameEvent {
  START_GAME = 'startGame', // Iniciar el juego
  SELECT_WORD = 'selectWord', // Seleccionar palabra a dibujar
  START_DRAWING = 'startDrawing', // Comenzar a dibujar
  SUBMIT_DRAWING = 'submitDrawing', // Enviar dibujo para evaluación
  SUBMIT_GUESS = 'submitGuess', // Enviar una respuesta/adivinanza
  TIMER_END = 'timerEnd', // El temporizador ha llegado a cero
  END_ROUND = 'endRound', // Finalizar ronda actual
  NEXT_ROUND = 'nextRound', // Pasar a siguiente ronda
  END_GAME = 'endGame', // Finalizar el juego
  PAUSE_GAME = 'pauseGame', // Pausar el juego
  RESUME_GAME = 'resumeGame', // Reanudar juego pausado
  ERROR_OCCURRED = 'errorOccurred', // Ocurrió un error
  RESET_GAME = 'resetGame', // Reiniciar el juego
}

// Interfaz para los datos de estado del juego
export interface IGameStateData {
  roomId: Types.ObjectId; // ID de la sala
  currentState: GameState; // Estado actual
  previousState?: GameState; // Estado anterior (para volver después de pausa)
  currentRound: number; // Ronda actual
  totalRounds: number; // Total de rondas configuradas
  timeRemaining: number; // Tiempo restante en segundos
  currentDrawerId?: Types.ObjectId; // Usuario que está dibujando
  currentWord?: string; // Palabra actual
  wordOptions?: string[]; // Opciones de palabras disponibles
  scores?: Map<string, number>; // Puntuaciones (userId -> puntos)
  drawings?: {
    // Dibujos realizados
    userId: Types.ObjectId; // ID del usuario
    imageData: string; // Datos del dibujo (URL o base64)
    word: string; // Palabra dibujada
    round: number; // Ronda en que se dibujó
  }[];
  guesses?: {
    // Adivinanzas realizadas
    userId: Types.ObjectId; // ID del usuario
    drawingId: Types.ObjectId; // ID del dibujo
    guess: string; // Texto de la adivinanza
    correct: boolean; // Si fue correcta
    score: number; // Puntos ganados
  }[];
  startedAt?: Date; // Cuándo se inició el juego
  lastUpdated: Date; // Última actualización del estado
  error?: {
    // Información de error
    message: string; // Mensaje de error
    code: string; // Código de error
  };
}

// Interfaz para el documento de Mongoose
export interface IGameStateDocument extends Document, IGameStateData {}

// Esquema para el estado del juego en MongoDB
const GameStateSchema = new Schema<IGameStateDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'GameRoom',
      required: true,
      index: true,
    },
    currentState: {
      type: String,
      enum: Object.values(GameState),
      required: true,
      default: GameState.WAITING,
    },
    previousState: {
      type: String,
      enum: Object.values(GameState),
    },
    currentRound: {
      type: Number,
      required: true,
      default: 0,
    },
    totalRounds: {
      type: Number,
      required: true,
      default: 3,
    },
    timeRemaining: {
      type: Number,
      required: true,
      default: 0,
    },
    currentDrawerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    currentWord: {
      type: String,
      select: false, // Oculto por defecto para evitar trampas
    },
    wordOptions: [
      {
        type: String,
      },
    ],
    scores: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    drawings: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        imageData: {
          type: String,
          required: true,
        },
        word: {
          type: String,
          required: true,
        },
        round: {
          type: Number,
          required: true,
        },
      },
    ],
    guesses: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        drawingId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        guess: {
          type: String,
          required: true,
        },
        correct: {
          type: Boolean,
          required: true,
          default: false,
        },
        score: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],
    startedAt: {
      type: Date,
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
    },
    error: {
      message: String,
      code: String,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para mejorar consultas
GameStateSchema.index({ roomId: 1 });
GameStateSchema.index({ roomId: 1, currentState: 1 });
GameStateSchema.index({ roomId: 1, 'drawings.round': 1 });

// Pre middleware para actualizar lastUpdated
GameStateSchema.pre<IGameStateDocument>('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Exportar el modelo
export const GameStateModel = model<IGameStateDocument>('GameState', GameStateSchema);
