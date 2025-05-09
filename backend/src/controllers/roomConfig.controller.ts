import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import * as roomConfigService from '../services/roomConfiguration.service';
import * as gameRoomsService from '../services/gameRooms.service';
import { GameRoomModel } from '../models';
import mongoose from 'mongoose';
import { GameMode, ScoringSystem, VisualTheme } from '../models/GameRoom.model';

/**
 * Obtener configuraciones disponibles
 */
export const getAvailableConfigs = async (_req: Request, res: Response) => {
  try {
    const configs = roomConfigService.getAvailableConfigs();

    return res.status(200).json(configs);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener configuraciones' });
  }
};

/**
 * Obtener configuración preestablecida
 */
export const getConfigPreset = async (req: Request, res: Response) => {
  try {
    const { preset } = req.params;

    if (!Object.values(roomConfigService.ConfigPreset).includes(preset as roomConfigService.ConfigPreset)) {
      return res.status(400).json({ message: 'Preset de configuración inválido' });
    }

    const config = roomConfigService.getConfigPreset(preset as roomConfigService.ConfigPreset);

    return res.status(200).json(config);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener preset de configuración' });
  }
};

/**
 * Crear configuración para una sala
 */
export const createRoomWithConfig = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { name, type, preset, configuration: configOverrides } = req.body;
    const userId = req.user.userId;

    // Crear configuración basada en preset y overrides
    const configuration = roomConfigService.createRoomConfig({
      preset: preset as roomConfigService.ConfigPreset,
      overrides: configOverrides,
    });

    // Crear sala con la configuración
    const room = await gameRoomsService.createRoom({
      name,
      hostId: userId,
      type,
      configuration,
    });

    return res.status(201).json({
      message: 'Sala creada exitosamente con configuración personalizada',
      room,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al crear sala con configuración' });
  }
};

/**
 * Actualizar configuración de una sala existente
 */
export const updateRoomConfig = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const { configuration, preset } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    // Verificar que el usuario es el anfitrión de la sala
    const room = await GameRoomModel.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    if (room.hostId.toString() !== userId) {
      return res.status(403).json({ message: 'Solo el anfitrión puede modificar la configuración' });
    }

    let newConfig;

    // Si se proporciona un preset, crear configuración basada en preset
    if (preset) {
      newConfig = roomConfigService.createRoomConfig({
        preset: preset as roomConfigService.ConfigPreset,
        overrides: configuration || {},
      });
    } else {
      // Si no hay preset, actualizar la configuración existente
      newConfig = await roomConfigService.updateRoomConfig(id, configuration);
    }

    return res.status(200).json({
      message: 'Configuración actualizada exitosamente',
      configuration: newConfig,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al actualizar configuración' });
  }
};

/**
 * Validar configuración (sin guardar cambios)
 */
export const validateConfig = async (req: Request, res: Response) => {
  try {
    const { configuration } = req.body;

    if (!configuration) {
      return res.status(400).json({ message: 'Se requiere una configuración para validar' });
    }

    // Intentar validar la configuración
    roomConfigService.validateConfig(configuration);

    return res.status(200).json({
      valid: true,
      message: 'La configuración es válida',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(422).json({
        valid: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      valid: false,
      message: 'Error desconocido al validar configuración',
    });
  }
};

/**
 * Sugerir configuración basada en número de jugadores y tipo
 */
export const suggestConfig = async (req: Request, res: Response) => {
  try {
    const { players, gameType } = req.query;

    // Validar parámetros
    const playerCount = players ? parseInt(players as string, 10) : 4;

    if (isNaN(playerCount) || playerCount < 2 || playerCount > 10) {
      return res.status(400).json({ message: 'Número de jugadores debe estar entre 2 y 10' });
    }

    // Validar tipo de juego
    const validGameTypes = ['casual', 'competitive', 'teams'];
    const type =
      gameType && validGameTypes.includes(gameType as string)
        ? (gameType as 'casual' | 'competitive' | 'teams')
        : 'casual';

    // Obtener configuración sugerida
    const suggestedConfig = roomConfigService.suggestConfiguration(playerCount, type);

    return res.status(200).json({
      message: `Configuración sugerida para ${playerCount} jugadores en modo ${type}`,
      configuration: suggestedConfig,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al sugerir configuración' });
  }
};

/**
 * Guardar configuración favorita para un usuario
 */
export const saveFavoriteConfig = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;
    const { configuration, name } = req.body;

    // Validar datos requeridos
    if (!configuration) {
      return res.status(400).json({ message: 'Se requiere una configuración para guardar' });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Se requiere un nombre para la configuración favorita' });
    }

    // Validar la configuración
    roomConfigService.validateConfig(configuration);

    // Guardar configuración favorita
    const result = await roomConfigService.saveUserFavoriteConfig(userId, configuration, name);

    return res.status(201).json({
      message: 'Configuración guardada como favorita',
      id: result.id,
      name: result.name,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al guardar configuración favorita' });
  }
};

/**
 * Obtener configuraciones favoritas de un usuario
 */
export const getFavoriteConfigs = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;

    // Obtener configuraciones favoritas
    const favorites = await roomConfigService.getUserFavoriteConfigs(userId);

    return res.status(200).json({
      message: 'Configuraciones favoritas recuperadas',
      favorites,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener configuraciones favoritas' });
  }
};

/**
 * Calcular tiempo adaptativo basado en número de jugadores
 */
export const calculateAdaptiveTime = async (req: Request, res: Response) => {
  try {
    const { baseTime, players, factor } = req.query;

    // Validar parámetros
    const baseTimeValue = baseTime ? parseInt(baseTime as string, 10) : 90;
    const playerCount = players ? parseInt(players as string, 10) : 4;
    const timeFactor = factor ? parseFloat(factor as string) : 1;

    if (isNaN(baseTimeValue) || baseTimeValue < 30 || baseTimeValue > 300) {
      return res.status(400).json({ message: 'Tiempo base debe estar entre 30 y 300 segundos' });
    }

    if (isNaN(playerCount) || playerCount < 2 || playerCount > 10) {
      return res.status(400).json({ message: 'Número de jugadores debe estar entre 2 y 10' });
    }

    if (isNaN(timeFactor) || timeFactor < 0.5 || timeFactor > 2) {
      return res.status(400).json({ message: 'Factor de tiempo debe estar entre 0.5 y 2' });
    }

    // Calcular tiempo adaptativo
    const adaptiveTime = roomConfigService.calculateAdaptiveRoundTime(baseTimeValue, playerCount, timeFactor);

    return res.status(200).json({
      baseTime: baseTimeValue,
      playerCount,
      timeFactor,
      adaptiveTime,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al calcular tiempo adaptativo' });
  }
};
