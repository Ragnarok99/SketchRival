import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enumeración para los niveles de dificultad de palabras
 */
export enum WordDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/**
 * Interfaz para la palabra en el banco de palabras
 */
export interface IWord {
  word: string; // La palabra en sí
  difficulty: WordDifficulty; // Nivel de dificultad
  usageCount: number; // Contador de veces usada
  lastUsed?: Date; // Última vez que fue usada
  enabled: boolean; // Si está activa o desactivada
}

/**
 * Interfaz para la categoría de palabras
 */
export interface IGameWordBank {
  name: string; // Nombre de la categoría
  description?: string; // Descripción breve
  words: IWord[]; // Palabras en esta categoría
  language: string; // Idioma de las palabras (código ISO)
  displayName: { [key: string]: string }; // Nombre localizado por idioma
  isDefault: boolean; // Si es una categoría predeterminada del sistema
  createdBy?: Types.ObjectId; // Usuario que creó la categoría (si es personalizada)
  isCustom: boolean; // Si es una categoría personalizada
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGameWordBankDocument extends IGameWordBank, Document {}

/**
 * Esquema para cada palabra individual
 */
const WordSchema = new Schema<IWord>({
  word: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30,
  },
  difficulty: {
    type: String,
    enum: Object.values(WordDifficulty),
    required: true,
    default: WordDifficulty.MEDIUM,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

/**
 * Esquema principal para el banco de palabras
 */
const GameWordBankSchema = new Schema<IGameWordBankDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    words: {
      type: [WordSchema],
      required: true,
      validate: {
        validator: function (words: IWord[]) {
          return words.length > 0;
        },
        message: 'La categoría debe contener al menos una palabra',
      },
    },
    language: {
      type: String,
      required: true,
      default: 'es', // Español por defecto
      minlength: 2,
      maxlength: 5,
    },
    displayName: {
      type: Map,
      of: String,
      default: {},
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  },
);

// Índices para consultas eficientes
GameWordBankSchema.index({ name: 1, language: 1 }, { unique: true }); // Nombre único por idioma
GameWordBankSchema.index({ isDefault: 1 }); // Para buscar categorías predeterminadas
GameWordBankSchema.index({ isCustom: 1, createdBy: 1 }); // Para buscar categorías personalizadas por usuario
GameWordBankSchema.index({ 'words.word': 1 }); // Para buscar palabras específicas

// Método para obtener palabras aleatorias según dificultad
GameWordBankSchema.methods.getRandomWords = function (
  difficulty: WordDifficulty | 'any' = 'any',
  count: number = 3,
): IWord[] {
  // Filtrar palabras habilitadas
  let availableWords = this.words.filter((word: IWord) => word.enabled);

  // Filtrar por dificultad si es necesario
  if (difficulty !== 'any') {
    availableWords = availableWords.filter((word: IWord) => word.difficulty === difficulty);
  }

  // Si no hay suficientes palabras, devolver todas las disponibles
  if (availableWords.length <= count) {
    return [...availableWords];
  }

  // Mezclar el array usando Fisher-Yates shuffle
  for (let i = availableWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableWords[i], availableWords[j]] = [availableWords[j], availableWords[i]];
  }

  // Devolver el número solicitado de palabras
  return availableWords.slice(0, count);
};

// Método para marcar una palabra como usada
GameWordBankSchema.methods.markWordAsUsed = async function (wordId: Types.ObjectId) {
  const wordIndex = this.words.findIndex((word: any) => word._id.equals(wordId));

  if (wordIndex >= 0) {
    this.words[wordIndex].usageCount += 1;
    this.words[wordIndex].lastUsed = new Date();
    await this.save();
    return true;
  }

  return false;
};

// Método para añadir una nueva palabra
GameWordBankSchema.methods.addWord = async function (word: string, difficulty: WordDifficulty = WordDifficulty.MEDIUM) {
  // Verificar si la palabra ya existe
  const exists = this.words.some((w: IWord) => w.word.toLowerCase() === word.toLowerCase());

  if (exists) {
    return { success: false, message: 'La palabra ya existe en esta categoría' };
  }

  // Añadir la nueva palabra
  this.words.push({
    word,
    difficulty,
    usageCount: 0,
    enabled: true,
  });

  await this.save();
  return { success: true, message: 'Palabra añadida correctamente' };
};

// Método estático para crear las categorías predeterminadas
GameWordBankSchema.statics.createDefaultCategories = async function () {
  const categories = [
    {
      name: 'animals',
      displayName: {
        es: 'Animales',
        en: 'Animals',
      },
      language: 'es',
      isDefault: true,
      isCustom: false,
      words: [
        { word: 'perro', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
        { word: 'gato', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
        { word: 'elefante', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
        { word: 'jirafa', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
        { word: 'ornitorrinco', difficulty: WordDifficulty.HARD, usageCount: 0, enabled: true },
      ],
    },
    {
      name: 'food',
      displayName: {
        es: 'Comida',
        en: 'Food',
      },
      language: 'es',
      isDefault: true,
      isCustom: false,
      words: [
        { word: 'pizza', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
        { word: 'hamburguesa', difficulty: WordDifficulty.EASY, usageCount: 0, enabled: true },
        { word: 'espagueti', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
        { word: 'sushi', difficulty: WordDifficulty.MEDIUM, usageCount: 0, enabled: true },
        { word: 'gazpacho', difficulty: WordDifficulty.HARD, usageCount: 0, enabled: true },
      ],
    },
  ];

  for (const category of categories) {
    // Verificar si ya existe
    const exists = await this.findOne({ name: category.name, language: category.language });
    if (!exists) {
      await this.create(category);
    }
  }
};

// Exportar el modelo
export const GameWordBankModel = model<IGameWordBankDocument>('GameWordBank', GameWordBankSchema);
