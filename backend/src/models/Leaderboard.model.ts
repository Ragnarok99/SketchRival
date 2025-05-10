import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  userId: Types.ObjectId; // Referencia al usuario
  username: string; // Cachear el nombre de usuario para evitar lookups frecuentes
  score: number;
  level?: number; // Nivel alcanzado, opcional pero útil
  rank?: number; // Rango calculado, podría no almacenarse directamente si se calcula al vuelo
  lastGamePlayedAt?: Date; // Para desempates o actividad
  category?: string; // Para tablas por categoría, ej. 'global', 'sports', 'animals'
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    level: {
      type: Number,
    },
    rank: {
      type: Number, // Podría ser calculado dinámicamente y no almacenado
    },
    lastGamePlayedAt: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      default: 'global', // Por defecto, la tabla de líderes es global
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Índice compuesto para consultas eficientes de leaderboards
LeaderboardEntrySchema.index({ category: 1, score: -1, lastGamePlayedAt: -1 });
LeaderboardEntrySchema.index({ category: 1, userId: 1 }, { unique: true }); // Un jugador por categoría

// Modelo para las entradas del Leaderboard
export const LeaderboardEntryModel = mongoose.model<ILeaderboardEntry>('LeaderboardEntry', LeaderboardEntrySchema);

export default LeaderboardEntryModel;
