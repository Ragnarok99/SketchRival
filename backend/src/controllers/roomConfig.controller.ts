import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import * as roomConfigService from '../services/roomConfiguration.service';
import * as gameRoomsService from '../services/gameRooms.service';
import { GameRoomModel } from '../models';
import mongoose from 'mongoose';

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
