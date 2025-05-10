import WordCategory, { IWord, IWordCategory } from '../models/WordBank.model';
import mongoose from 'mongoose';

class WordBankService {
  /**
   * Crear una nueva categoría de palabras
   */
  async createCategory(categoryData: Partial<IWordCategory>): Promise<IWordCategory> {
    try {
      const category = new WordCategory(categoryData);
      await category.save();
      return category;
    } catch (error) {
      throw new Error(`Error al crear categoría: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtener todas las categorías activas
   */
  async getAllCategories(includeInactive = false): Promise<IWordCategory[]> {
    try {
      const query = includeInactive ? {} : { isActive: true };
      return await WordCategory.find(query).sort({ name: 1 });
    } catch (error) {
      throw new Error(`Error al obtener categorías: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtener una categoría por su ID
   */
  async getCategoryById(id: string): Promise<IWordCategory | null> {
    try {
      return await WordCategory.findById(id);
    } catch (error) {
      throw new Error(`Error al obtener categoría: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Actualizar una categoría
   */
  async updateCategory(id: string, updateData: Partial<IWordCategory>): Promise<IWordCategory | null> {
    try {
      return await WordCategory.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      throw new Error(`Error al actualizar categoría: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Desactivar una categoría
   */
  async deactivateCategory(id: string): Promise<IWordCategory | null> {
    try {
      return await WordCategory.findByIdAndUpdate(id, { isActive: false }, { new: true });
    } catch (error) {
      throw new Error(`Error al desactivar categoría: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Agregar una palabra a una categoría
   */
  async addWordToCategory(categoryId: string, word: IWord): Promise<IWordCategory | null> {
    try {
      return await WordCategory.findByIdAndUpdate(categoryId, { $push: { words: word } }, { new: true });
    } catch (error) {
      throw new Error(`Error al agregar palabra: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Eliminar una palabra de una categoría
   */
  async removeWordFromCategory(categoryId: string, wordId: string): Promise<IWordCategory | null> {
    try {
      return await WordCategory.findByIdAndUpdate(categoryId, { $pull: { words: { _id: wordId } } }, { new: true });
    } catch (error) {
      throw new Error(`Error al eliminar palabra: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtener palabras aleatorias de una categoría específica
   */
  async getRandomWordsFromCategory(
    categoryId: string,
    count = 3,
    difficulty?: 'easy' | 'medium' | 'hard',
  ): Promise<string[]> {
    try {
      const category = await WordCategory.findById(categoryId);
      if (!category) throw new Error('Categoría no encontrada');

      let filteredWords = category.words;

      // Filtrar por dificultad si se especifica
      if (difficulty) {
        filteredWords = filteredWords.filter((word) => word.difficulty === difficulty);
      }

      // Si no hay suficientes palabras en la dificultad especificada, usar todas
      if (filteredWords.length < count) {
        filteredWords = category.words;
      }

      // Barajar palabras y tomar la cantidad solicitada
      const shuffled = [...filteredWords].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).map((word) => word.word);
    } catch (error) {
      throw new Error(
        `Error al obtener palabras aleatorias: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Obtener palabras aleatorias de categorías aleatorias
   */
  async getRandomWords(count = 3, difficulty?: 'easy' | 'medium' | 'hard'): Promise<string[]> {
    try {
      // Obtener categorías activas
      const categories = await WordCategory.find({ isActive: true });
      if (categories.length === 0) throw new Error('No hay categorías activas');

      // Seleccionar una categoría aleatoria
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      // Obtener palabras aleatorias de la categoría
      const categoryId = (randomCategory._id as mongoose.Types.ObjectId).toString();
      return this.getRandomWordsFromCategory(categoryId, count, difficulty);
    } catch (error) {
      throw new Error(
        `Error al obtener palabras aleatorias: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export default new WordBankService();
