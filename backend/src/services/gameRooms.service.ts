import { Types } from 'mongoose';
import {
  GameRoomModel,
  GameRoomStatus,
  GameRoomType,
  IGameRoom,
  GamePlayerModel,
  PlayerRole,
  PlayerStatus,
  IGamePlayer,
  GameMessageModel,
  MessageType,
} from '../models';

// Tipos para parámetros y respuestas
export interface CreateRoomParams {
  name: string;
  hostId: string;
  type?: GameRoomType;
  configuration?: Partial<IGameRoom['configuration']>;
  accessCode?: string;
}

export interface JoinRoomParams {
  roomId: string;
  userId: string;
  username: string;
  role?: PlayerRole;
}

export interface UpdateRoomParams {
  roomId: string;
  hostId: string; // Para verificar que el usuario es el anfitrión
  name?: string;
  status?: GameRoomStatus;
  configuration?: Partial<IGameRoom['configuration']>;
  type?: GameRoomType;
  accessCode?: string;
}

export interface RoomListParams {
  page?: number;
  limit?: number;
  type?: GameRoomType;
  status?: GameRoomStatus;
  filter?: string; // Para búsqueda por nombre
}

// Crear una nueva sala
export async function createRoom(params: CreateRoomParams) {
  try {
    const { name, hostId, type = GameRoomType.PUBLIC, configuration = {}, accessCode } = params;

    // Crear la sala
    const room = await GameRoomModel.create({
      name,
      hostId: new Types.ObjectId(hostId),
      type,
      configuration,
      accessCode: type === GameRoomType.PRIVATE ? accessCode : undefined,
      status: GameRoomStatus.WAITING,
    });

    // Añadir al anfitrión como jugador automáticamente
    const hostData = await addUserToRoom({
      roomId: room._id.toString(),
      userId: hostId,
      username: name, // Temporal hasta que obtengamos el nombre real
      role: PlayerRole.HOST,
    });

    // Crear mensaje de sistema para la sala
    await GameMessageModel.createSystemMessage(room._id, `Sala "${name}" creada`);

    return {
      room,
      host: hostData,
    };
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

// Obtener listado de salas con filtros
export async function listRooms(params: RoomListParams = {}) {
  try {
    const { page = 1, limit = 20, type = GameRoomType.PUBLIC, status = GameRoomStatus.WAITING, filter = '' } = params;

    const query: any = {
      type,
      status,
    };

    // Añadir filtro por nombre si se proporciona
    if (filter) {
      query.name = { $regex: filter, $options: 'i' };
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Obtener salas y contar total
    const [rooms, total] = await Promise.all([
      GameRoomModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate({
        path: 'players',
        select: 'username role status',
      }),
      GameRoomModel.countDocuments(query),
    ]);

    return {
      rooms,
      totalRooms: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error listing rooms:', error);
    throw error;
  }
}

// Obtener detalles de una sala específica
export async function getRoomDetails(roomId: string) {
  try {
    const room = await GameRoomModel.findById(roomId).populate({
      path: 'players',
      select: 'userId username role status score isConnected avatarColor',
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // Obtener los últimos 20 mensajes
    const messages = await GameMessageModel.find({ roomId: room._id }).sort({ sentAt: -1 }).limit(20);

    return {
      room,
      messages: messages.reverse(), // Revertir para orden cronológico
    };
  } catch (error) {
    console.error(`Error getting room details for ${roomId}:`, error);
    throw error;
  }
}

// Añadir un usuario a una sala
export async function addUserToRoom(params: JoinRoomParams): Promise<IGamePlayer> {
  try {
    const { roomId, userId, username, role = PlayerRole.PLAYER } = params;

    // Verificar que la sala existe y está en estado válido
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== GameRoomStatus.WAITING) {
      throw new Error('Cannot join a room that is not in waiting state');
    }

    // Verificar si el jugador ya está en la sala
    const existingPlayer = await GamePlayerModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
    });

    if (existingPlayer) {
      // Si el jugador estaba desconectado, actualizar su estado
      if (!existingPlayer.isConnected) {
        existingPlayer.isConnected = true;
        existingPlayer.status = PlayerStatus.WAITING;
        existingPlayer.lastActivity = new Date();
        await existingPlayer.save();

        // Crear mensaje de reconexión
        await GameMessageModel.createSystemMessage(
          new Types.ObjectId(roomId),
          `${username} se ha reconectado a la sala`,
        );
      }
      return existingPlayer;
    }

    // Verificar si la sala está llena
    const playerCount = await GamePlayerModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
    });

    if (playerCount >= room.configuration.maxPlayers) {
      throw new Error('Room is full');
    }

    // Crear nuevo jugador
    const player = await GamePlayerModel.create({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
      username,
      role,
      status: PlayerStatus.WAITING,
      isConnected: true,
      lastActivity: new Date(),
    });

    // Añadir referencia del jugador a la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      $push: { players: player._id },
    });

    // Crear mensaje de unión
    await GameMessageModel.createJoinMessage(new Types.ObjectId(roomId), new Types.ObjectId(userId), username);

    return player;
  } catch (error) {
    console.error(`Error adding user ${userId} to room ${params.roomId}:`, error);
    throw error;
  }
}

// Actualizar configuración de sala
export async function updateRoom(params: UpdateRoomParams) {
  try {
    const { roomId, hostId, name, status, configuration, type, accessCode } = params;

    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Verificar que el usuario es el anfitrión
    if (room.hostId.toString() !== hostId) {
      throw new Error('Only the host can update room settings');
    }

    // Verificar que no queremos cambiar a privado sin código de acceso
    if (type === GameRoomType.PRIVATE && !accessCode && !room.accessCode) {
      throw new Error('Private rooms require an access code');
    }

    // Preparar objeto de actualización
    const updateData: Partial<IGameRoom> = {};

    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (configuration)
      updateData.configuration = {
        ...room.configuration,
        ...configuration,
      };
    if (type) updateData.type = type;

    // Solo actualizar el código si se proporciona y el tipo es privado
    if (type === GameRoomType.PRIVATE && accessCode) {
      updateData.accessCode = accessCode;
    }

    // Actualizar la sala
    const updatedRoom = await GameRoomModel.findByIdAndUpdate(
      roomId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate({
      path: 'players',
      select: 'userId username role status',
    });

    // Crear mensaje del sistema sobre la actualización
    await GameMessageModel.createSystemMessage(
      new Types.ObjectId(roomId),
      `El anfitrión ha actualizado la configuración de la sala`,
    );

    return updatedRoom;
  } catch (error) {
    console.error(`Error updating room ${params.roomId}:`, error);
    throw error;
  }
}

// Abandonar una sala
export async function leaveRoom(roomId: string, userId: string, username: string) {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Verificar si el usuario está en la sala
    const player = await GamePlayerModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
    });

    if (!player) {
      throw new Error('Player not in room');
    }

    // Verificar si es el anfitrión
    const isHost = player.role === PlayerRole.HOST;

    // Si es el anfitrión, cerrar la sala o transferir a otro jugador
    if (isHost) {
      // Buscar otro jugador para transferir
      const newHost = await GamePlayerModel.findOne({
        roomId: new Types.ObjectId(roomId),
        userId: { $ne: new Types.ObjectId(userId) },
        role: PlayerRole.PLAYER,
        isConnected: true,
      });

      if (newHost) {
        // Transferir anfitrión
        newHost.role = PlayerRole.HOST;
        await newHost.save();

        // Actualizar anfitrión en la sala
        await GameRoomModel.findByIdAndUpdate(roomId, {
          hostId: newHost.userId,
        });

        // Mensaje de transferencia
        await GameMessageModel.createSystemMessage(
          new Types.ObjectId(roomId),
          `${username} ha abandonado la sala. ${newHost.username} es ahora el anfitrión.`,
        );
      } else {
        // Cerrar la sala si no hay a quién transferir
        await GameRoomModel.findByIdAndUpdate(roomId, {
          status: GameRoomStatus.CLOSED,
        });

        // Mensaje de cierre
        await GameMessageModel.createSystemMessage(
          new Types.ObjectId(roomId),
          `El anfitrión ha abandonado la sala. La sala se ha cerrado.`,
        );
      }
    } else {
      // Si no es anfitrión, simplemente marcar como LEFT
      await GamePlayerModel.findByIdAndUpdate(player._id, {
        status: PlayerStatus.LEFT,
        isConnected: false,
      });

      // Mensaje de abandono
      await GameMessageModel.createLeaveMessage(new Types.ObjectId(roomId), new Types.ObjectId(userId), username);
    }

    return {
      success: true,
      wasClosed:
        isHost && !(await GamePlayerModel.findOne({ roomId: new Types.ObjectId(roomId), role: PlayerRole.HOST })),
    };
  } catch (error) {
    console.error(`Error leaving room ${roomId} for user ${userId}:`, error);
    throw error;
  }
}

// Cerrar una sala (solo el anfitrión)
export async function closeRoom(roomId: string, hostId: string) {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Verificar que el usuario es el anfitrión
    if (room.hostId.toString() !== hostId) {
      throw new Error('Only the host can close the room');
    }

    // Actualizar estado de la sala
    const updatedRoom = await GameRoomModel.findByIdAndUpdate(roomId, { status: GameRoomStatus.CLOSED }, { new: true });

    // Actualizar estado de todos los jugadores
    await GamePlayerModel.updateMany({ roomId: new Types.ObjectId(roomId) }, { status: PlayerStatus.LEFT });

    // Crear mensaje de cierre
    await GameMessageModel.createSystemMessage(new Types.ObjectId(roomId), `El anfitrión ha cerrado la sala.`);

    return updatedRoom;
  } catch (error) {
    console.error(`Error closing room ${roomId}:`, error);
    throw error;
  }
}
