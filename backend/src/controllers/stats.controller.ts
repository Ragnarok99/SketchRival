import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { GameStatsModel, UserRewardModel, GameRewardModel } from '../models';
import * as gameRoomsService from '../services/gameRooms.service';

// Obtener estadísticas de un jugador específico
export const getPlayerStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const playerStats = await GameStatsModel.findOne({ userId });

    if (!playerStats) {
      return res.status(404).json({ message: 'Estadísticas no encontradas para este usuario' });
    }

    return res.status(200).json({
      stats: playerStats,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener estadísticas' });
  }
};

// Obtener estadísticas del jugador autenticado
export const getCurrentPlayerStats = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;

    const playerStats = await GameStatsModel.findOne({ userId });

    if (!playerStats) {
      // Si no existe, crear estadísticas vacías
      const newStats = new GameStatsModel({
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        drawingsCreated: 0,
        correctlyGuessedDrawings: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        fastestGuessTime: 0,
        averageGuessTime: 0,
        totalPlayTime: 0,
        longestSession: 0,
        wordsCategoriesPlayed: [],
        friendsPlayed: 0,
        achievementsUnlocked: 0,
        rankPoints: 0,
      });

      await newStats.save();

      return res.status(200).json({
        stats: newStats,
      });
    }

    // Obtener también el ranking actual del jugador
    const currentRank = await GameStatsModel.getUserRanking(userId);

    return res.status(200).json({
      stats: playerStats,
      currentRank,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener estadísticas' });
  }
};

// Obtener ranking de jugadores
export const getPlayerRankings = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const sortBy =
      (req.query.sortBy as 'rankPoints' | 'totalScore' | 'gamesWon' | 'drawingAccuracy' | 'guessAccuracy') ||
      'rankPoints';

    const rankings = await gameRoomsService.getPlayerRankings(limit, sortBy);

    return res.status(200).json({
      rankings,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener rankings' });
  }
};

// Obtener logros de un jugador específico
export const getPlayerAchievements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    // Obtener logros desbloqueados por el usuario
    const userAchievements = await UserRewardModel.find({ userId }).sort({ unlockedAt: -1 }).lean();

    if (!userAchievements || userAchievements.length === 0) {
      return res.status(200).json({
        achievements: [],
        message: 'Este usuario aún no ha desbloqueado ningún logro',
      });
    }

    // Obtener detalles de las recompensas
    const rewardIds = userAchievements.map((ua) => ua.rewardId);
    const rewardDetails = await GameRewardModel.find({ _id: { $in: rewardIds } }).lean();

    // Combinar los datos
    const achievements = userAchievements.map((ua) => {
      const details = rewardDetails.find((rd) => rd._id.toString() === ua.rewardId.toString());
      return {
        ...ua,
        details,
      };
    });

    return res.status(200).json({
      achievements,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener logros' });
  }
};

// Obtener logros del jugador autenticado
export const getCurrentPlayerAchievements = async (req: IRequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;

    // Obtener logros desbloqueados por el usuario
    const userAchievements = await UserRewardModel.find({ userId }).sort({ unlockedAt: -1 }).lean();

    if (!userAchievements || userAchievements.length === 0) {
      return res.status(200).json({
        achievements: [],
        message: 'Aún no has desbloqueado ningún logro',
      });
    }

    // Obtener detalles de las recompensas
    const rewardIds = userAchievements.map((ua) => ua.rewardId);
    const rewardDetails = await GameRewardModel.find({ _id: { $in: rewardIds } }).lean();

    // Combinar los datos
    const achievements = userAchievements.map((ua) => {
      const details = rewardDetails.find((rd) => rd._id.toString() === ua.rewardId.toString());
      return {
        ...ua,
        details,
      };
    });

    // Marcar como vistos (no nuevos)
    await UserRewardModel.updateMany({ userId, isNew: true }, { $set: { isNew: false } });

    return res.status(200).json({
      achievements,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener logros' });
  }
};
