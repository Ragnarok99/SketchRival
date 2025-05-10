import mongoose, { Document, Schema } from 'mongoose';

// Interfaz para una palabra individual
export interface IWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Interfaz para una categoría de palabras
export interface IWordCategory extends Document {
  name: string;
  description: string;
  words: IWord[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema para las palabras
const WordSchema = new Schema<IWord>({
  word: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
});

// Esquema para las categorías
const WordCategorySchema = new Schema<IWordCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    words: [WordSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para búsquedas eficientes
WordCategorySchema.index({ name: 1 });
WordCategorySchema.index({ isActive: 1 });

// Modelo para las categorías de palabras
export const WordCategory = mongoose.model<IWordCategory>('WordCategory', WordCategorySchema);

export default WordCategory;
