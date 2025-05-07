import { Types } from 'mongoose';
import { GameRoomModel, GamePlayerModel, GameMessageModel } from '../models';
import { PlayerStatus, PlayerRole } from '../models/GamePlayer.model';
import { GameRoomStatus } from '../models/GameRoom.model';

/**
 * Establece el estado de "listo" de un jugador en una sala
 * @param roomId ID de la sala
 * @param userId ID del usuario
 * @param isReady Estado de listo (true/false)
 * @returns El jugador actualizado
 */
export async function setPlayerReady(roomId: string, userId: string, isReady: boolean) {
  try {
    // Verificar que la sala existe y está en estado de espera
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    if (room.status !== GameRoomStatus.WAITING) {
      throw new Error('La sala no está en estado de espera');
    }

    // Buscar y actualizar el estado del jugador
    const player = await GamePlayerModel.findOneAndUpdate(
      {
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      },
      {
        isReady,
        status: isReady ? PlayerStatus.READY : PlayerStatus.WAITING,
        lastActivity: new Date(),
      },
      { new: true },
    );

    if (!player) {
      throw new Error('Jugador no encontrado en esta sala');
    }

    // Crear mensaje de sistema sobre el cambio de estado
    await GameMessageModel.createSystemMessage(
      new Types.ObjectId(roomId),
      `${player.username} ${isReady ? 'está listo' : 'ya no está listo'}`,
    );

    // Comprobar si todos los jugadores están listos y hay al menos 2 jugadores
    await checkAllPlayersReady(roomId);

    return player;
  } catch (error) {
    console.error(`Error al cambiar estado de listo para usuario ${userId} en sala ${roomId}:`, error);
    throw error;
  }
}

/**
 * Expulsa a un jugador de una sala (solo para el anfitrión)
 * @param roomId ID de la sala
 * @param hostId ID del anfitrión que solicita la expulsión
 * @param playerToKickId ID del jugador a expulsar
 * @returns La sala actualizada
 */
export async function kickPlayer(roomId: string, hostId: string, playerToKickId: string) {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Verificar que el solicitante es el anfitrión
    const host = await GamePlayerModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(hostId),
      role: PlayerRole.HOST,
    });

    if (!host) {
      throw new Error('Solo el anfitrión puede expulsar jugadores');
    }

    // Buscar el jugador a expulsar
    const playerToKick = await GamePlayerModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(playerToKickId),
    });

    if (!playerToKick) {
      throw new Error('Jugador no encontrado en esta sala');
    }

    if (playerToKick.role === PlayerRole.HOST) {
      throw new Error('No puedes expulsar al anfitrión');
    }

    // Guardar el nombre del jugador antes de eliminarlo
    const kickedPlayerName = playerToKick.username;

    // Eliminar al jugador de la sala
    await GamePlayerModel.deleteOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(playerToKickId),
    });

    // Eliminar referencia del jugador en la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      $pull: { players: playerToKick._id },
    });

    // Crear mensaje de sistema sobre la expulsión
    await GameMessageModel.createSystemMessage(
      new Types.ObjectId(roomId),
      `${kickedPlayerName} ha sido expulsado de la sala`,
    );

    // Devolver la sala actualizada
    return await GameRoomModel.findById(roomId).populate({
      path: 'players',
      select: 'userId username role status score isConnected isReady avatarColor',
    });
  } catch (error) {
    console.error(`Error al expulsar al jugador ${playerToKickId} por ${hostId} en sala ${roomId}:`, error);
    throw error;
  }
}

/**
 * Inicia el juego (solo para el anfitrión)
 * @param roomId ID de la sala
 * @param hostId ID del anfitrión
 * @returns La sala con el estado actualizado
 */
export async function startGame(roomId: string, hostId: string) {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Verificar que el solicitante es el anfitrión
    const host = await GamePlayerModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(hostId),
      role: PlayerRole.HOST,
    });

    if (!host) {
      throw new Error('Solo el anfitrión puede iniciar el juego');
    }

    // Verificar que hay al menos 2 jugadores
    const playerCount = await GamePlayerModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
    });

    if (playerCount < 2) {
      throw new Error('Se necesitan al menos 2 jugadores para iniciar el juego');
    }

    // Verificar que todos los jugadores estén listos (excepto el anfitrión)
    const notReadyPlayers = await GamePlayerModel.find({
      roomId: new Types.ObjectId(roomId),
      role: { $ne: PlayerRole.HOST },
      isReady: false,
    });

    if (notReadyPlayers.length > 0) {
      throw new Error('No todos los jugadores están listos');
    }

    // Actualizar estado de la sala
    const updatedRoom = await GameRoomModel.findByIdAndUpdate(
      roomId,
      {
        status: GameRoomStatus.PLAYING,
        startedAt: new Date(),
      },
      { new: true },
    ).populate({
      path: 'players',
      select: 'userId username role status score isConnected isReady avatarColor',
    });

    // Actualizar estado de todos los jugadores
    await GamePlayerModel.updateMany({ roomId: new Types.ObjectId(roomId) }, { status: PlayerStatus.PLAYING });

    // Crear mensaje de sistema sobre el inicio del juego
    await GameMessageModel.createSystemMessage(new Types.ObjectId(roomId), 'El juego ha comenzado');

    return updatedRoom;
  } catch (error) {
    console.error(`Error al iniciar juego por ${hostId} en sala ${roomId}:`, error);
    throw error;
  }
}

/**
 * Verifica si todos los jugadores están listos y actualiza el estado de la sala
 * @param roomId ID de la sala
 * @returns true si todos están listos, false en caso contrario
 */
async function checkAllPlayersReady(roomId: string): Promise<boolean> {
  // Contar jugadores totales (excluyendo al anfitrión)
  const playerCount = await GamePlayerModel.countDocuments({
    roomId: new Types.ObjectId(roomId),
    role: { $ne: PlayerRole.HOST },
  });

  // Si no hay otros jugadores además del anfitrión, no es necesario verificar
  if (playerCount === 0) {
    return false;
  }

  // Contar jugadores listos (excluyendo al anfitrión)
  const readyCount = await GamePlayerModel.countDocuments({
    roomId: new Types.ObjectId(roomId),
    role: { $ne: PlayerRole.HOST },
    isReady: true,
  });

  // Verificar si todos están listos
  return readyCount === playerCount;
}

/**
 * Obtiene el estado de "todos listos" de una sala
 * @param roomId ID de la sala
 * @returns Objeto con información de readiness
 */
export async function getRoomReadyStatus(roomId: string) {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Contar jugadores totales (excluyendo al anfitrión)
    const playerCount = await GamePlayerModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
      role: { $ne: PlayerRole.HOST },
    });

    // Contar jugadores listos (excluyendo al anfitrión)
    const readyCount = await GamePlayerModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
      role: { $ne: PlayerRole.HOST },
      isReady: true,
    });

    // Obtener total de jugadores (incluyendo anfitrión)
    const totalPlayers = await GamePlayerModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
    });

    return {
      allReady: playerCount > 0 && readyCount === playerCount,
      readyCount,
      playerCount,
      totalPlayers,
      canStart: playerCount > 0 && readyCount === playerCount && totalPlayers >= 2,
    };
  } catch (error) {
    console.error(`Error al obtener estado de preparación de sala ${roomId}:`, error);
    throw error;
  }
}
