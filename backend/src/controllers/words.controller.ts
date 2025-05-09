import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { GameWordBankModel, WordDifficulty } from '../models';
import * as gameRoomsService from '../services/gameRooms.service';

// Obtener todas las categorías de palabras disponibles
export const getWordCategories = async (req: Request, res: Response) => {
  try {
    const language = (req.query.lang as string) || 'es';

    // Filtrar categorías por idioma y solo incluir información básica
    const categories = await GameWordBankModel.find({ language })
      .select('name displayName description isDefault isCustom createdBy')
      .lean();

    return res.status(200).json({
      categories,
      count: categories.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener categorías' });
  }
};

// Obtener palabras de una categoría específica
export const getCategoryWords = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    const category = await GameWordBankModel.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Aplicar filtros opcionales
    const difficulty = req.query.difficulty as WordDifficulty;
    const enabled = req.query.enabled === 'true';

    let filteredWords = [...category.words];

    if (difficulty) {
      filteredWords = filteredWords.filter((word) => word.difficulty === difficulty);
    }

    if (req.query.enabled !== undefined) {
      filteredWords = filteredWords.filter((word) => word.enabled === enabled);
    }

    return res.status(200).json({
      category: {
        _id: category._id,
        name: category.name,
        displayName: category.displayName,
        description: category.description,
        language: category.language,
        isDefault: category.isDefault,
        isCustom: category.isCustom,
      },
      words: filteredWords,
      count: filteredWords.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener palabras' });
  }
};

// Obtener palabras aleatorias para una sala
export const getRandomWords = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { roomId, count, difficulty } = req.body;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'ID de sala inválido o faltante' });
    }

    const words = await gameRoomsService.getRandomWordsForRoom(roomId, count || 3, difficulty || 'any');

    return res.status(200).json({
      words,
      count: words.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener palabras aleatorias' });
  }
};

// Crear nueva categoría de palabras
export const createWordCategory = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { name, displayName, description, language, words } = req.body;

    // Verificar que el nombre no esté ya en uso para este idioma
    const existing = await GameWordBankModel.findOne({ name, language });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una categoría con este nombre e idioma' });
    }

    // Crear nueva categoría
    const newCategory = new GameWordBankModel({
      name,
      displayName,
      description,
      language: language || 'es',
      words: words || [],
      isDefault: false,
      isCustom: true,
      createdBy: req.user.userId,
    });

    await newCategory.save();

    return res.status(201).json({
      message: 'Categoría creada exitosamente',
      category: newCategory,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al crear categoría' });
  }
};

// Actualizar una categoría de palabras
export const updateWordCategory = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const { displayName, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    const category = await GameWordBankModel.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si es una categoría por defecto
    if (category.isDefault) {
      return res.status(403).json({ message: 'No se pueden modificar categorías por defecto' });
    }

    // Verificar si el usuario es el creador o un administrador
    if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
    }

    // Actualizar solo campos permitidos
    if (displayName) category.displayName = displayName;
    if (description) category.description = description;

    await category.save();

    return res.status(200).json({
      message: 'Categoría actualizada exitosamente',
      category,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al actualizar categoría' });
  }
};

// Añadir palabras a una categoría
export const addWordsToCategory = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const { words } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de palabras para añadir' });
    }

    const category = await GameWordBankModel.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si el usuario es el creador o un administrador
    if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
    }

    // Añadir nuevas palabras, evitando duplicados
    const results = {
      added: 0,
      duplicates: 0,
      errors: [] as string[],
    };

    for (const word of words) {
      // Validar formato de palabra
      if (!word.word || typeof word.word !== 'string') {
        results.errors.push(`Palabra inválida: ${JSON.stringify(word)}`);
        continue;
      }

      // Normalizar palabra
      const normalizedWord = word.word.trim().toLowerCase();

      // Verificar duplicados
      if (category.words.some((w) => w.word.toLowerCase() === normalizedWord)) {
        results.duplicates++;
        continue;
      }

      // Añadir nueva palabra
      category.words.push({
        word: normalizedWord,
        difficulty: word.difficulty || WordDifficulty.MEDIUM,
        usageCount: 0,
        enabled: true,
      });

      results.added++;
    }

    if (results.added > 0) {
      await category.save();
    }

    return res.status(200).json({
      message: `Se han añadido ${results.added} palabras a la categoría`,
      results,
      category,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al añadir palabras' });
  }
};

// Actualizar una palabra específica
export const updateWord = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id, wordId } = req.params;
    const { word, difficulty, enabled } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ message: 'ID de palabra inválido' });
    }

    const category = await GameWordBankModel.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si el usuario es el creador o un administrador
    if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
    }

    // Buscar la palabra
    const wordIndex = category.words.findIndex((w) => w._id.toString() === wordId);

    if (wordIndex === -1) {
      return res.status(404).json({ message: 'Palabra no encontrada en esta categoría' });
    }

    // Actualizar campos permitidos
    if (word) category.words[wordIndex].word = word;
    if (difficulty) category.words[wordIndex].difficulty = difficulty;
    if (enabled !== undefined) category.words[wordIndex].enabled = enabled;

    await category.save();

    return res.status(200).json({
      message: 'Palabra actualizada exitosamente',
      word: category.words[wordIndex],
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al actualizar palabra' });
  }
};

// Eliminar una palabra específica
export const deleteWord = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id, wordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ message: 'ID de palabra inválido' });
    }

    const category = await GameWordBankModel.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si el usuario es el creador o un administrador
    if (category.createdBy && category.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta categoría' });
    }

    // Verificar que no sea la última palabra
    if (category.words.length <= 1) {
      return res.status(400).json({ message: 'No se puede eliminar la última palabra de una categoría' });
    }

    // Buscar y eliminar la palabra
    const wordIndex = category.words.findIndex((w) => w._id.toString() === wordId);

    if (wordIndex === -1) {
      return res.status(404).json({ message: 'Palabra no encontrada en esta categoría' });
    }

    const deletedWord = category.words[wordIndex];
    category.words.splice(wordIndex, 1);

    await category.save();

    return res.status(200).json({
      message: 'Palabra eliminada exitosamente',
      deletedWord,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al eliminar palabra' });
  }
};
