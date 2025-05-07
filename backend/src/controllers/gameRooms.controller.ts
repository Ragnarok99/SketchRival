import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import * as gameRoomsService from '../services/gameRooms.service';
import mongoose from 'mongoose';
import { GameRoomModel } from '../models';

// Crear una nueva sala
export const createRoom = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { name, type, configuration } = req.body;
    const userId = req.user.userId;

    const room = await gameRoomsService.createRoom({
      name,
      type,
      configuration,
      hostId: userId,
    });

    return res.status(201).json({
      message: 'Sala creada exitosamente',
      room,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al crear la sala' });
  }
};

// Listar salas (con filtros opcionales)
export const listRooms = async (req: Request, res: Response) => {
  try {
    const { status, type, filter, limit, page } = req.query;

    const filters: Record<string, unknown> = {
      // Por defecto, solo listar salas públicas en estado "waiting"
      type: type || 'public',
      status: status || 'waiting',
      limit: limit ? parseInt(limit as string) : 20,
      page: page ? parseInt(page as string) : 1,
    };

    // Añadir filtro de búsqueda si existe
    if (filter && typeof filter === 'string') {
      filters.filter = filter;
    }

    const rooms = await gameRoomsService.listRooms(filters);

    return res.status(200).json(rooms);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al listar salas' });
  }
};

// Obtener detalles de una sala específica
export const getRoomDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    const roomDetails = await gameRoomsService.getRoomDetails(id);

    return res.status(200).json(roomDetails);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener detalles de la sala' });
  }
};

// Actualizar configuración de una sala
export const updateRoom = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    const updatedRoom = await gameRoomsService.updateRoom({
      roomId: id,
      hostId: userId,
      ...updates,
    });

    return res.status(200).json({
      message: 'Sala actualizada exitosamente',
      room: updatedRoom,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al actualizar la sala' });
  }
};

// Unirse a una sala
export const joinRoom = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const { accessCode } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    // Validar acceso a sala privada si es necesario
    if (accessCode) {
      // Obtener la sala y verificar el código de acceso
      const room = await GameRoomModel.findById(id);
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }

      if (room.type === 'private' && room.accessCode !== accessCode) {
        return res.status(403).json({ message: 'Código de acceso incorrecto' });
      }
    }

    const player = await gameRoomsService.addUserToRoom({
      roomId: id,
      userId,
      username,
      role: undefined, // Usar rol por defecto
    });

    return res.status(200).json({
      message: 'Te has unido a la sala exitosamente',
      player,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al unirse a la sala' });
  }
};

// Abandonar una sala
export const leaveRoom = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const username = req.user.username;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    await gameRoomsService.leaveRoom(id, userId, username);

    return res.status(200).json({
      message: 'Has abandonado la sala exitosamente',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al abandonar la sala' });
  }
};

// Cerrar/eliminar una sala
export const closeRoom = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    await gameRoomsService.closeRoom(id, userId);

    return res.status(200).json({
      message: 'Sala cerrada exitosamente',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al cerrar la sala' });
  }
};
