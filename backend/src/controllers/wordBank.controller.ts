import { Request, Response } from 'express';
import wordBankService from '../services/wordBank.service';
import { IWord } from '../models/WordBank.model';

/**
 * Controlador para el banco de palabras
 */
class WordBankController {
  /**
   * Obtener todas las categorías de palabras
   */
  async getAllCategories(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await wordBankService.getAllCategories(includeInactive);

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener categorías',
      });
    }
  }

  /**
   * Obtener una categoría por su ID
   */
  async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await wordBankService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener categoría',
      });
    }
  }

  /**
   * Crear una nueva categoría
   */
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description, words, isActive } = req.body;

      // Validar datos
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren nombre y descripción para la categoría',
        });
      }

      const newCategory = await wordBankService.createCategory({
        name,
        description,
        words: words || [],
        isActive: isActive !== undefined ? isActive : true,
      });

      return res.status(201).json({
        success: true,
        data: newCategory,
        message: 'Categoría creada con éxito',
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear categoría',
      });
    }
  }

  /**
   * Actualizar una categoría
   */
  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      // Verificar si la categoría existe
      const categoryExists = await wordBankService.getCategoryById(id);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
        });
      }

      // Actualizar la categoría
      const updatedCategory = await wordBankService.updateCategory(id, {
        ...(name && { name }),
        ...(description && { description }),
        ...(isActive !== undefined && { isActive }),
      });

      return res.status(200).json({
        success: true,
        data: updatedCategory,
        message: 'Categoría actualizada con éxito',
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar categoría',
      });
    }
  }

  /**
   * Desactivar una categoría
   */
  async deactivateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si la categoría existe
      const categoryExists = await wordBankService.getCategoryById(id);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
        });
      }

      // Desactivar la categoría
      const deactivatedCategory = await wordBankService.deactivateCategory(id);

      return res.status(200).json({
        success: true,
        data: deactivatedCategory,
        message: 'Categoría desactivada con éxito',
      });
    } catch (error) {
      console.error('Error al desactivar categoría:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al desactivar categoría',
      });
    }
  }

  /**
   * Agregar una palabra a una categoría
   */
  async addWordToCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { word, difficulty = 'medium' } = req.body;

      // Validar datos
      if (!word) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere una palabra',
        });
      }

      // Verificar si la categoría existe
      const categoryExists = await wordBankService.getCategoryById(id);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
        });
      }

      // Validar dificultad
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'La dificultad debe ser easy, medium o hard',
        });
      }

      // Agregar la palabra
      const updatedCategory = await wordBankService.addWordToCategory(id, {
        word,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
      });

      return res.status(200).json({
        success: true,
        data: updatedCategory,
        message: 'Palabra agregada con éxito',
      });
    } catch (error) {
      console.error('Error al agregar palabra:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al agregar palabra',
      });
    }
  }

  /**
   * Eliminar una palabra de una categoría
   */
  async removeWordFromCategory(req: Request, res: Response) {
    try {
      const { categoryId, wordId } = req.params;

      // Verificar si la categoría existe
      const categoryExists = await wordBankService.getCategoryById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada',
        });
      }

      // Eliminar la palabra
      const updatedCategory = await wordBankService.removeWordFromCategory(categoryId, wordId);

      return res.status(200).json({
        success: true,
        data: updatedCategory,
        message: 'Palabra eliminada con éxito',
      });
    } catch (error) {
      console.error('Error al eliminar palabra:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al eliminar palabra',
      });
    }
  }

  /**
   * Obtener palabras aleatorias para el juego
   */
  async getRandomWords(req: Request, res: Response) {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const difficulty = req.query.difficulty as 'easy' | 'medium' | 'hard' | undefined;
      const categoryId = req.query.categoryId as string;

      let words: string[];

      if (categoryId) {
        // Verificar si la categoría existe
        const categoryExists = await wordBankService.getCategoryById(categoryId);
        if (!categoryExists) {
          return res.status(404).json({
            success: false,
            message: 'Categoría no encontrada',
          });
        }

        // Obtener palabras de la categoría específica
        words = await wordBankService.getRandomWordsFromCategory(categoryId, count, difficulty);
      } else {
        // Obtener palabras de cualquier categoría
        words = await wordBankService.getRandomWords(count, difficulty);
      }

      return res.status(200).json({
        success: true,
        data: words,
      });
    } catch (error) {
      console.error('Error al obtener palabras aleatorias:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener palabras aleatorias',
      });
    }
  }
}

export default new WordBankController();
