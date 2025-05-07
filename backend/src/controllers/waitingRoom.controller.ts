import { Request, Response } from 'express';
import { GameRoom } from '../models/gameRoom.model';
import { GamePlayer } from '../models/gamePlayer.model';
import gameRoomService from '../services/gameRoom.service';
import gamePlayerService from '../services/gamePlayer.service';
import socketService from '../services/socket.service';

/**
 * Establecer estado "listo" de un jugador
 */
export const setReady = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { ready } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Verificar si el jugador existe en la sala
    const player = await gamePlayerService.findPlayerInRoom(userId, roomId);

    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado en esta sala' });
    }

    // Actualizar estado
    await gamePlayerService.updatePlayerStatus(userId, roomId, ready);

    // Obtener sala actualizada
    const room = await gameRoomService.getRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    // Notificar a todos en la sala usando socket
    socketService.getIO()?.to(roomId).emit('room:playerReady', {
      playerId: userId,
      isReady: ready,
      room,
    });

    return res.status(200).json({
      success: true,
      player: {
        ...player,
        isReady: ready,
      },
    });
  } catch (error) {
    console.error('Error al establecer estado listo:', error);
    return res.status(500).json({ message: 'Error al establecer estado' });
  }
};

/**
 * Expulsar a un jugador de la sala
 */
export const kickPlayer = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId } = req.body;
    const hostId = req.user?.id;

    if (!hostId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Verificar si el usuario es el anfitrión
    const room = await gameRoomService.getRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    if (room.hostId !== hostId) {
      return res.status(403).json({ message: 'Solo el anfitrión puede expulsar jugadores' });
    }

    // Eliminar al jugador de la sala
    await gamePlayerService.removePlayerFromRoom(playerId, roomId);

    // Obtener sala actualizada
    const updatedRoom = await gameRoomService.getRoomById(roomId);

    // Notificar a todos en la sala usando socket
    socketService.getIO()?.to(roomId).emit('room:playerLeft', {
      playerId,
      room: updatedRoom,
    });

    // Enviar notificación al jugador expulsado
    socketService.sendUserNotification(playerId, 'warning', `Has sido expulsado de la sala: ${room.name}`);

    return res.status(200).json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error al expulsar jugador:', error);
    return res.status(500).json({ message: 'Error al expulsar jugador' });
  }
};

/**
 * Iniciar el juego
 */
export const startGame = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user?.id;

    if (!hostId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Verificar si el usuario es el anfitrión
    const room = await gameRoomService.getRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    if (room.hostId !== hostId) {
      return res.status(403).json({ message: 'Solo el anfitrión puede iniciar el juego' });
    }

    // Verificar si todos los jugadores están listos
    const readyStatus = await gamePlayerService.getRoomReadyStatus(roomId);

    if (!readyStatus.allReady || readyStatus.playerCount < 2) {
      return res.status(400).json({
        message:
          'No se puede iniciar el juego. Todos los jugadores deben estar listos y debe haber al menos 2 jugadores.',
      });
    }

    // Cambiar estado de la sala y crear juego
    const gameRoom = await gameRoomService.startGame(roomId);

    // Notificar a todos en la sala usando socket
    socketService.notifyGameStarted(roomId, gameRoom);

    return res.status(200).json({
      success: true,
      game: gameRoom.currentGame,
    });
  } catch (error) {
    console.error('Error al iniciar juego:', error);
    return res.status(500).json({ message: 'Error al iniciar el juego' });
  }
};

/**
 * Obtener estado "listo" de todos los jugadores en una sala
 */
export const getRoomReadyStatus = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Obtener estadísticas de "listos"
    const readyStatus = await gamePlayerService.getRoomReadyStatus(roomId);

    return res.status(200).json({ readyStatus });
  } catch (error) {
    console.error('Error al obtener estado de listos:', error);
    return res.status(500).json({ message: 'Error al obtener estado de la sala' });
  }
};
