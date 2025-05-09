import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interface que define las estadísticas agregadas de un jugador en el juego
 */
export interface IGameStats {
  // Referencias
  userId: Types.ObjectId; // Usuario al que pertenecen las estadísticas

  // Estadísticas básicas
  gamesPlayed: number; // Número total de partidas jugadas
  gamesWon: number; // Número de partidas ganadas
  totalScore: number; // Puntuación total acumulada

  // Estadísticas de dibujo
  drawingsCreated: number; // Número total de dibujos realizados
  correctlyGuessedDrawings: number; // Cuántos de tus dibujos fueron adivinados correctamente
  drawingAccuracy: number; // Porcentaje de dibujos adivinados correctamente (0-100)

  // Estadísticas de adivinanzas
  totalGuesses: number; // Total de intentos de adivinar
  correctGuesses: number; // Adivinanzas correctas
  guessAccuracy: number; // Porcentaje de aciertos (0-100)
  fastestGuessTime: number; // Tiempo más rápido en adivinar (segundos)
  averageGuessTime: number; // Tiempo promedio de adivinanza (segundos)

  // Estadísticas de tiempo
  totalPlayTime: number; // Tiempo total jugado (minutos)
  longestSession: number; // Sesión más larga (minutos)

  // Estadísticas de palabras
  wordsCategoriesPlayed: string[]; // Categorías de palabras jugadas
  favoriteCategory?: string; // Categoría más jugada

  // Estadísticas sociales
  friendsPlayed: number; // Número de amigos distintos con los que ha jugado

  // Logros
  achievementsUnlocked: number; // Número de logros desbloqueados

  // Ranking
  highestRank?: number; // Rango más alto alcanzado
  currentRank?: number; // Rango actual
  rankPoints: number; // Puntos de ranking

  // Fechas de seguimiento
  lastPlayed?: Date; // Última vez que jugó
  createdAt?: Date; // Fecha de creación del registro
  updatedAt?: Date; // Última actualización
}

export interface IGameStatsDocument extends IGameStats, Document {}

/**
 * Esquema de MongoDB para estadísticas de juego
 */
const GameStatsSchema = new Schema<IGameStatsDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Un documento de estadísticas por usuario
    },

    // Estadísticas básicas
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },

    // Estadísticas de dibujo
    drawingsCreated: {
      type: Number,
      default: 0,
    },
    correctlyGuessedDrawings: {
      type: Number,
      default: 0,
    },
    drawingAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Estadísticas de adivinanzas
    totalGuesses: {
      type: Number,
      default: 0,
    },
    correctGuesses: {
      type: Number,
      default: 0,
    },
    guessAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    fastestGuessTime: {
      type: Number,
      default: 0,
    },
    averageGuessTime: {
      type: Number,
      default: 0,
    },

    // Estadísticas de tiempo
    totalPlayTime: {
      type: Number,
      default: 0,
    },
    longestSession: {
      type: Number,
      default: 0,
    },

    // Estadísticas de palabras
    wordsCategoriesPlayed: {
      type: [String],
      default: [],
    },
    favoriteCategory: {
      type: String,
    },

    // Estadísticas sociales
    friendsPlayed: {
      type: Number,
      default: 0,
    },

    // Logros
    achievementsUnlocked: {
      type: Number,
      default: 0,
    },

    // Ranking
    highestRank: {
      type: Number,
    },
    currentRank: {
      type: Number,
    },
    rankPoints: {
      type: Number,
      default: 0,
    },

    // Fechas de seguimiento
    lastPlayed: {
      type: Date,
    },
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  },
);

// Índices para consultas eficientes
GameStatsSchema.index({ userId: 1 }, { unique: true });
GameStatsSchema.index({ totalScore: -1 }); // Para ranking global por puntuación
GameStatsSchema.index({ rankPoints: -1 }); // Para ranking global por puntos de ranking
GameStatsSchema.index({ gamesPlayed: -1 }); // Para ranking por cantidad de juegos
GameStatsSchema.index({ gamesWon: -1 }); // Para ranking por victorias
GameStatsSchema.index({ drawingAccuracy: -1 }); // Para ranking por precisión de dibujo
GameStatsSchema.index({ guessAccuracy: -1 }); // Para ranking por precisión de adivinanzas
GameStatsSchema.index({ lastPlayed: -1 }); // Para filtrar por actividad reciente

/**
 * Método para actualizar la precisión de dibujo al guardar
 */
GameStatsSchema.pre<IGameStatsDocument>('save', function (next) {
  // Calcular precisión de dibujo
  if (this.drawingsCreated > 0) {
    this.drawingAccuracy = Math.round((this.correctlyGuessedDrawings / this.drawingsCreated) * 100);
  }

  // Calcular precisión de adivinanzas
  if (this.totalGuesses > 0) {
    this.guessAccuracy = Math.round((this.correctGuesses / this.totalGuesses) * 100);
  }

  // Actualizar última jugada si no está establecida
  if (!this.lastPlayed) {
    this.lastPlayed = new Date();
  }

  next();
});

// Método estático para obtener el ranking de un usuario
GameStatsSchema.statics.getUserRanking = async function (userId: Types.ObjectId) {
  // Obtener posición del usuario en el ranking general
  const userStats = await this.findOne({ userId });
  if (!userStats) return null;

  // Contar usuarios con más puntaje
  const aheadCount = await this.countDocuments({
    rankPoints: { $gt: userStats.rankPoints },
  });

  // La posición es el conteo + 1
  return aheadCount + 1;
};

// Exportar el modelo
export const GameStatsModel = model<IGameStatsDocument>('GameStats', GameStatsSchema);
