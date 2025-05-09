import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enumeración para las categorías de recompensas
 */
export enum RewardCategory {
  GENERAL = 'general', // Logros generales del juego
  DRAWING = 'drawing', // Relacionados con dibujos
  GUESSING = 'guessing', // Relacionados con adivinanzas
  SOCIAL = 'social', // Interacciones sociales
  STREAK = 'streak', // Rachas/frecuencia de juego
  COLLECTION = 'collection', // Coleccionables
  SKILL = 'skill', // Habilidad del jugador
  SPECIAL = 'special', // Eventos especiales/temporales
}

/**
 * Enumeración para los tipos de recompensas
 */
export enum RewardType {
  ACHIEVEMENT = 'achievement', // Logro normal
  BADGE = 'badge', // Insignia (visual)
  COSMETIC = 'cosmetic', // Recompensa cosmética
  TITLE = 'title', // Título para el usuario
  CURRENCY = 'currency', // Moneda del juego
  SPECIAL_ACCESS = 'access', // Acceso a características especiales
}

/**
 * Enumeración para el nivel de rareza
 */
export enum RewardRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

/**
 * Interfaz para definir una condición de desbloqueo
 */
export interface IUnlockCondition {
  type: string; // Tipo de condición (gamesPlayed, totalScore, etc.)
  threshold: number; // Valor necesario para desbloquear
  comparison: 'gte' | 'gt' | 'lte' | 'lt' | 'eq'; // Operador de comparación
  description: string; // Descripción legible para el usuario
}

/**
 * Interfaz para la recompensa/logro
 */
export interface IGameReward {
  name: string; // Nombre único de la recompensa
  displayName: {
    // Nombre localizado por idioma
    [key: string]: string;
  };
  description: {
    // Descripción localizada por idioma
    [key: string]: string;
  };
  category: RewardCategory; // Categoría de la recompensa
  type: RewardType; // Tipo de recompensa
  rarity: RewardRarity; // Rareza/dificultad para obtener
  iconUrl?: string; // URL del icono
  unlockConditions: IUnlockCondition[]; // Condiciones para desbloquear
  points: number; // Puntos que otorga al obtenerla
  isHidden: boolean; // Si es un logro oculto
  isLimited: boolean; // Si está disponible temporalmente
  availableFrom?: Date; // Fecha desde la que está disponible
  availableUntil?: Date; // Fecha hasta la que está disponible
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGameRewardDocument extends IGameReward, Document {}

/**
 * Esquema para condiciones de desbloqueo
 */
const UnlockConditionSchema = new Schema<IUnlockCondition>({
  type: {
    type: String,
    required: true,
  },
  threshold: {
    type: Number,
    required: true,
  },
  comparison: {
    type: String,
    enum: ['gte', 'gt', 'lte', 'lt', 'eq'],
    default: 'gte',
  },
  description: {
    type: String,
    required: true,
  },
});

/**
 * Esquema principal para recompensas
 */
const GameRewardSchema = new Schema<IGameRewardDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: Map,
      of: String,
      required: true,
      validate: {
        validator: function (displayNames: Map<string, string>) {
          // Debe tener al menos un idioma
          return displayNames.size > 0;
        },
        message: 'Debe proporcionar al menos un nombre localizado',
      },
    },
    description: {
      type: Map,
      of: String,
      required: true,
      validate: {
        validator: function (descriptions: Map<string, string>) {
          // Debe tener al menos un idioma
          return descriptions.size > 0;
        },
        message: 'Debe proporcionar al menos una descripción localizada',
      },
    },
    category: {
      type: String,
      enum: Object.values(RewardCategory),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(RewardType),
      required: true,
    },
    rarity: {
      type: String,
      enum: Object.values(RewardRarity),
      required: true,
      default: RewardRarity.COMMON,
    },
    iconUrl: {
      type: String,
    },
    unlockConditions: {
      type: [UnlockConditionSchema],
      required: true,
      validate: {
        validator: function (conditions: IUnlockCondition[]) {
          // Debe tener al menos una condición
          return conditions.length > 0;
        },
        message: 'Debe proporcionar al menos una condición de desbloqueo',
      },
    },
    points: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    isLimited: {
      type: Boolean,
      default: false,
    },
    availableFrom: {
      type: Date,
      validate: {
        validator: function (date: Date) {
          // @ts-ignore: Accediendo a this en un contexto de Mongoose
          return !this.isLimited || date instanceof Date;
        },
        message: 'Se requiere fecha de inicio para recompensas limitadas',
      },
    },
    availableUntil: {
      type: Date,
      validate: {
        validator: function (date: Date) {
          // @ts-ignore: Accediendo a this en un contexto de Mongoose
          return !this.isLimited || date instanceof Date;
        },
        message: 'Se requiere fecha de fin para recompensas limitadas',
      },
    },
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  },
);

// Índices para consultas eficientes
GameRewardSchema.index({ name: 1 }, { unique: true });
GameRewardSchema.index({ category: 1 });
GameRewardSchema.index({ type: 1 });
GameRewardSchema.index({ rarity: 1 });
GameRewardSchema.index({ isLimited: 1 });
GameRewardSchema.index({ isHidden: 1 });
GameRewardSchema.index({ 'unlockConditions.type': 1 });

/**
 * Método estático para crear las recompensas predeterminadas
 */
GameRewardSchema.statics.createDefaultRewards = async function () {
  const rewards = [
    // Logros generales
    {
      name: 'first_game',
      displayName: {
        es: 'Primer Juego',
        en: 'First Game',
      },
      description: {
        es: 'Completa tu primera partida en el juego',
        en: 'Complete your first game',
      },
      category: RewardCategory.GENERAL,
      type: RewardType.ACHIEVEMENT,
      rarity: RewardRarity.COMMON,
      unlockConditions: [
        {
          type: 'gamesPlayed',
          threshold: 1,
          comparison: 'gte',
          description: 'Jugar una partida completa',
        },
      ],
      points: 10,
      isHidden: false,
      isLimited: false,
    },

    // Logro de dibujo
    {
      name: 'artist_beginner',
      displayName: {
        es: 'Artista Principiante',
        en: 'Beginner Artist',
      },
      description: {
        es: 'Haz que otros jugadores adivinen correctamente 10 de tus dibujos',
        en: 'Have other players correctly guess 10 of your drawings',
      },
      category: RewardCategory.DRAWING,
      type: RewardType.BADGE,
      rarity: RewardRarity.UNCOMMON,
      unlockConditions: [
        {
          type: 'correctlyGuessedDrawings',
          threshold: 10,
          comparison: 'gte',
          description: 'Que adivinen 10 dibujos tuyos',
        },
      ],
      points: 25,
      isHidden: false,
      isLimited: false,
    },

    // Logro de adivinanzas
    {
      name: 'fast_guesser',
      displayName: {
        es: 'Adivino Veloz',
        en: 'Fast Guesser',
      },
      description: {
        es: 'Adivina correctamente una palabra en menos de 10 segundos',
        en: 'Correctly guess a word in less than 10 seconds',
      },
      category: RewardCategory.GUESSING,
      type: RewardType.TITLE,
      rarity: RewardRarity.RARE,
      unlockConditions: [
        {
          type: 'fastestGuessTime',
          threshold: 10,
          comparison: 'lt',
          description: 'Adivinar en menos de 10 segundos',
        },
      ],
      points: 50,
      isHidden: false,
      isLimited: false,
    },
  ];

  for (const reward of rewards) {
    // Verificar si ya existe
    const exists = await this.findOne({ name: reward.name });
    if (!exists) {
      await this.create(reward);
    }
  }
};

// Exportar el modelo
export const GameRewardModel = model<IGameRewardDocument>('GameReward', GameRewardSchema);

/**
 * Interfaz para el registro de recompensas de usuario
 */
export interface IUserReward {
  userId: Types.ObjectId; // Usuario al que pertenece
  rewardId: Types.ObjectId; // ID de la recompensa obtenida
  rewardName: string; // Nombre de la recompensa (redundante para consultas)
  unlockedAt: Date; // Fecha de desbloqueo
  isNew: boolean; // Si el usuario ya la ha visto
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserRewardDocument extends IUserReward, Document {}

/**
 * Esquema para registrar recompensas obtenidas por usuarios
 */
const UserRewardSchema = new Schema<IUserRewardDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rewardId: {
      type: Schema.Types.ObjectId,
      ref: 'GameReward',
      required: true,
    },
    rewardName: {
      type: String,
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    isNew: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índice compuesto único para evitar duplicados
UserRewardSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

// Índices adicionales
UserRewardSchema.index({ userId: 1, isNew: 1 }); // Para consultar nuevas recompensas por usuario
UserRewardSchema.index({ unlockedAt: -1 }); // Para ordenar por fecha de desbloqueo

// Exportar el modelo de recompensas de usuario
export const UserRewardModel = model<IUserRewardDocument>('UserReward', UserRewardSchema);
