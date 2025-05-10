import mongoose, { Document, Schema, Types } from 'mongoose';

// Interfaz para definir recompensas de temporada, podría ser más compleja
interface ISeasonReward {
  rankMin: number; // Ej. 1 para el primer puesto
  rankMax: number; // Ej. 1 para el primer puesto, o 10 para top 10
  description: string; // Ej. "Medalla de Oro Temporada 1", "500 Monedas"
  // rewardId?: Types.ObjectId; // Podría referenciar a un modelo de Recompensas más general
}

export interface ISeason extends Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  leaderboardCategoryKey: string; // Ej. "season_1_global", "event_summer2024"
  rewards?: ISeasonReward[]; // Recompensas para los mejores jugadores de la temporada
}

const SeasonRewardSchema = new Schema<ISeasonReward>(
  {
    rankMin: { type: Number, required: true },
    rankMax: { type: Number, required: true },
    description: { type: String, required: true },
    // rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' }, // Si tuvieras un modelo Reward
  },
  { _id: false },
);

const SeasonSchema = new Schema<ISeason>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    leaderboardCategoryKey: {
      // Usado para enlazar con LeaderboardEntryModel.category
      type: String,
      required: true,
      unique: true, // Cada temporada debe tener una clave de leaderboard única
      index: true,
    },
    rewards: [SeasonRewardSchema],
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

SeasonSchema.index({ startDate: 1, endDate: 1 });

// Validar que endDate sea posterior a startDate
SeasonSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('La fecha de finalización debe ser posterior a la fecha de inicio.'));
  } else {
    next();
  }
});

// Modelo para las Temporadas
export const SeasonModel = mongoose.model<ISeason>('Season', SeasonSchema);

export default SeasonModel;
