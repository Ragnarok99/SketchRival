import { Schema, model, Document, Types } from 'mongoose';

// Enumeración para los estados del juego
export enum GameState {
  // Estados principales del juego
  WAITING = 'waiting', // Sala de espera antes de iniciar
  STARTING = 'starting', // Iniciando juego (countdown)
  WORD_SELECTION = 'word_selection', // Selección de palabra para dibujar
  DRAWING = 'drawing', // Dibujando
  GUESSING = 'guessing', // Adivinando lo que se dibuja
  ROUND_END = 'round_end', // Fin de ronda, muestra resultados
  GAME_END = 'game_end', // Fin del juego, resultados finales

  // Estados auxiliares
  PAUSED = 'paused', // Juego pausado
  ERROR = 'error', // Error en el juego
}

// Enumeración para los eventos que provocan transiciones
export enum GameEvent {
  START_GAME = 'start_game', // Iniciar el juego
  SELECT_WORD = 'select_word', // Seleccionar palabra a dibujar
  START_DRAWING = 'startDrawing', // Comenzar a dibujar
  SUBMIT_DRAWING = 'submit_drawing', // Enviar dibujo para evaluación
  SUBMIT_GUESS = 'submit_guess', // Enviar una respuesta/adivinanza
  TIMER_END = 'timer_end', // El temporizador ha llegado a cero
  END_ROUND = 'endRound', // Finalizar ronda actual
  NEXT_ROUND = 'next_round', // Pasar a siguiente ronda
  END_GAME = 'end_game', // Finalizar el juego
  PAUSE_GAME = 'pause_game', // Pausar el juego
  RESUME_GAME = 'resume_game', // Reanudar juego pausado
  ERROR_OCCURRED = 'error_occurred', // Ocurrió un error
  RESET_GAME = 'reset_game', // Reiniciar el juego
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
  scores?: Map<string, number> | Record<string, number>; // Puntuaciones (userId -> puntos)
  drawings?: {
    // Dibujos realizados
    userId: Types.ObjectId; // ID del usuario
    imageData: string; // Datos del dibujo (URL o base64)
    word: string; // Palabra dibujada
    round: number; // Ronda en que se dibujó
    createdAt?: Date;
  }[];
  guesses?: {
    // Adivinanzas realizadas
    userId: Types.ObjectId; // ID del usuario
    drawingId: Types.ObjectId; // ID del dibujo
    guess: string; // Texto de la adivinanza
    correct: boolean; // Si fue correcta
    score: number; // Puntos ganados
    createdAt?: Date;
  }[];
  startedAt?: Date; // Cuándo se inició el juego
  endedAt?: Date; // Cuándo se terminó el juego
  lastUpdated: Date; // Última actualización del estado
  error?: {
    // Información de error
    message: string; // Mensaje de error
    code: string; // Código de error
    timestamp?: Date;
  };
  winnerId?: Types.ObjectId;
  currentRoundIaEvaluation?: {
    isCorrect: boolean;
    justification: string;
    error?: string;
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
        createdAt: {
          type: Date,
          default: Date.now,
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    startedAt: {
      type: Date,
    },
    endedAt: {
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
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    currentRoundIaEvaluation: {
      isCorrect: {
        type: Boolean,
      },
      justification: {
        type: String,
      },
      error: {
        type: String,
      },
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
