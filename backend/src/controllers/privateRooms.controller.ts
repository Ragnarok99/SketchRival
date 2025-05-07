import { Request, Response } from 'express';
import { IRequestWithUser } from '../middleware/auth.middleware';
import * as privateRoomsService from '../services/privateRooms.service';
import * as gameRoomsService from '../services/gameRooms.service';
import mongoose from 'mongoose';

/**
 * Genera un nuevo código de acceso para una sala privada
 */
export const regenerateAccessCode = async (req: IRequestWithUser, res: Response) => {
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

    const newCode = await privateRoomsService.regenerateAccessCode(id, userId);

    return res.status(200).json({
      message: 'Código de acceso regenerado exitosamente',
      accessCode: newCode,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al regenerar código de acceso' });
  }
};

/**
 * Cambia la visibilidad de una sala (pública/privada)
 */
export const toggleRoomVisibility = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const { makePrivate } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    if (typeof makePrivate !== 'boolean') {
      return res.status(400).json({ message: 'El parámetro makePrivate debe ser un booleano' });
    }

    const result = await privateRoomsService.toggleRoomVisibility(id, userId, makePrivate);

    return res.status(200).json({
      message: `Sala cambiada a ${makePrivate ? 'privada' : 'pública'} exitosamente`,
      type: result.type,
      accessCode: result.accessCode,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al cambiar visibilidad de sala' });
  }
};

/**
 * Crea una nueva invitación para una sala privada
 */
export const createInvitation = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;
    const { email, userId: invitedUserId, expiryHours } = req.body;
    const invitedByUserId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    if (!email) {
      return res.status(400).json({ message: 'El email del invitado es requerido' });
    }

    const invitation = await privateRoomsService.createRoomInvitation(
      id,
      email,
      invitedUserId,
      invitedByUserId,
      expiryHours,
    );

    // TODO: Enviar email con invitación

    return res.status(201).json({
      message: 'Invitación creada exitosamente',
      invitation: {
        roomId: invitation.roomId,
        email: invitation.invitedEmail,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al crear invitación' });
  }
};

/**
 * Lista invitaciones activas para una sala
 */
export const listInvitations = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de sala inválido' });
    }

    const invitations = privateRoomsService.getRoomInvitations(id);

    return res.status(200).json({
      invitations: invitations.map((inv) => ({
        email: inv.invitedEmail,
        expiresAt: inv.expiresAt,
        token: inv.token.substring(0, 8) + '...',
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al listar invitaciones' });
  }
};

/**
 * Acepta una invitación usando un token
 */
export const acceptInvitation = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { token } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    if (!token) {
      return res.status(400).json({ message: 'Token de invitación requerido' });
    }

    // Validar invitación
    const invitation = privateRoomsService.validateInvitation(token);

    if (!invitation) {
      return res.status(400).json({ message: 'Invitación inválida o expirada' });
    }

    // Unir usuario a la sala
    const player = await gameRoomsService.addUserToRoom({
      roomId: invitation.roomId,
      userId,
      username,
    });

    return res.status(200).json({
      message: 'Te has unido a la sala exitosamente',
      roomId: invitation.roomId,
      player,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al aceptar invitación' });
  }
};

/**
 * Busca una sala por código de acceso
 */
export const findRoomByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code || code.length < 6) {
      return res.status(400).json({ message: 'Código de acceso inválido' });
    }

    const room = await privateRoomsService.findRoomByAccessCode(code);

    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada con ese código' });
    }

    return res.status(200).json({
      roomId: room._id,
      name: room.name,
      players: room.players.length,
      maxPlayers: room.configuration.maxPlayers,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al buscar sala por código' });
  }
};

/**
 * Lista las salas privadas del usuario
 */
export const getUserPrivateRooms = async (req: IRequestWithUser, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;
    const rooms = await privateRoomsService.getUserPrivateRooms(userId);

    return res.status(200).json({
      rooms: rooms.map((room) => ({
        id: room._id,
        name: room.name,
        accessCode: room.accessCode,
        players: room.players.length,
        maxPlayers: room.configuration.maxPlayers,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido al listar salas privadas' });
  }
};
