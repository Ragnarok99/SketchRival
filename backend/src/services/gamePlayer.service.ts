import { Types } from 'mongoose';
import { GamePlayerModel } from '../models';
import { PlayerStatus, PlayerRole } from '../models/GamePlayer.model';

/**
 * Buscar un jugador en una sala específica
 */
export const findPlayerInRoom = async (userId: string, roomId: string) => {
  return GamePlayerModel.findOne({
    userId: new Types.ObjectId(userId),
    roomId: new Types.ObjectId(roomId),
  });
};

/**
 * Actualizar el estado de un jugador (listo/no listo)
 */
export const updatePlayerStatus = async (userId: string, roomId: string, isReady: boolean) => {
  return GamePlayerModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      roomId: new Types.ObjectId(roomId),
    },
    { isReady },
    { new: true },
  );
};

/**
 * Eliminar un jugador de una sala
 */
export const removePlayerFromRoom = async (playerId: string, roomId: string) => {
  return GamePlayerModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(playerId),
      roomId: new Types.ObjectId(roomId),
    },
    {
      status: PlayerStatus.DISCONNECTED,
      isReady: false,
    },
    { new: true },
  );
};

/**
 * Obtener el estado de "listos" de todos los jugadores en una sala
 */
export const getRoomReadyStatus = async (roomId: string) => {
  // Buscar todos los jugadores activos en la sala
  const players = await GamePlayerModel.find({
    roomId: new Types.ObjectId(roomId),
    status: { $in: [PlayerStatus.WAITING, PlayerStatus.READY] },
  });

  // Contar jugadores totales y listos
  const playerCount = players.length;
  const readyCount = players.filter((player) => player.isReady).length;

  return {
    playerCount,
    readyCount,
    allReady: playerCount > 0 && playerCount === readyCount,
  };
};

/**
 * Cambiar el rol de un jugador en una sala
 */
export const changePlayerRole = async (userId: string, roomId: string, role: PlayerRole) => {
  return GamePlayerModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      roomId: new Types.ObjectId(roomId),
    },
    { role },
    { new: true },
  );
};

/**
 * Añadir un jugador a una sala
 */
export const addPlayerToRoom = async (userId: string, roomId: string, role: PlayerRole = PlayerRole.PLAYER) => {
  // Verificar si el jugador ya está en la sala
  const existingPlayer = await findPlayerInRoom(userId, roomId);

  if (existingPlayer) {
    // Si ya existe pero había salido, reactivarlo
    if (existingPlayer.status === PlayerStatus.DISCONNECTED) {
      return GamePlayerModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          roomId: new Types.ObjectId(roomId),
        },
        {
          status: PlayerStatus.WAITING,
          isReady: false,
        },
        { new: true },
      );
    }
    // Si ya está activo, devolver el jugador existente
    return existingPlayer;
  }

  // Crear nuevo jugador en la sala
  const newPlayer = new GamePlayerModel({
    userId: new Types.ObjectId(userId),
    roomId: new Types.ObjectId(roomId),
    role,
    status: PlayerStatus.WAITING,
    isReady: false,
    joinedAt: new Date(),
  });

  return newPlayer.save();
};

// Exportar como objeto por defecto para mantener consistencia con el controlador
export default {
  findPlayerInRoom,
  updatePlayerStatus,
  removePlayerFromRoom,
  getRoomReadyStatus,
  changePlayerRole,
  addPlayerToRoom,
};
