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
  GameStatsModel,
  GameWordBankModel,
} from '../models';
import crypto from 'crypto';

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
      status,
    };

    // Filtrar por tipo si se especifica
    if (type) {
      query.type = type;
    }

    // Añadir filtro por nombre si se proporciona
    if (filter) {
      // Mejorado para permitir búsqueda por nombre o código (para salas privadas)
      if (filter.length === 6 && /^[A-Z0-9]+$/.test(filter)) {
        // Si es un patrón que parece un código de acceso, buscar por código
        query.$or = [{ name: { $regex: filter, $options: 'i' } }, { accessCode: filter }];
      } else {
        // Búsqueda normal por nombre
        query.name = { $regex: filter, $options: 'i' };
      }
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

// Método para obtener palabras aleatorias para una sala
export const getRandomWordsForRoom = async (
  roomId: string,
  count: number = 3,
  difficulty: 'easy' | 'medium' | 'hard' | 'any' = 'any',
) => {
  try {
    // Obtener la sala para verificar sus categorías configuradas
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Obtener categorías configuradas o usar por defecto
    const categories = room.configuration.drawingCategories || ['animales', 'objetos', 'comida'];

    // Mapear a nombres de categorías en el banco de palabras
    const categoryMap: Record<string, string> = {
      animales: 'animals',
      comida: 'food',
      // Añadir más mapeos según sea necesario
    };

    // Obtener categorías mapeadas o usar las originales
    const mappedCategories = categories.map((cat) => categoryMap[cat] || cat);

    // Buscar categorías en el banco de palabras
    const wordBanks = await GameWordBankModel.find({
      name: { $in: mappedCategories },
      language: 'es', // Idioma por defecto
    });

    if (!wordBanks || wordBanks.length === 0) {
      // Si no hay categorías específicas, usar todas las categorías disponibles
      const defaultWordBanks = await GameWordBankModel.find({ isDefault: true, language: 'es' });
      if (!defaultWordBanks || defaultWordBanks.length === 0) {
        throw new Error('No hay palabras disponibles');
      }
      wordBanks.push(...defaultWordBanks);
    }

    // Coleccionar palabras de todas las categorías
    let allWords: { word: string; category: string; difficulty: string }[] = [];

    for (const bank of wordBanks) {
      // Filtrar palabras por dificultad si es necesario
      const bankWords = bank.words
        .filter((w) => w.enabled && (difficulty === 'any' || w.difficulty === difficulty))
        .map((w) => ({
          word: w.word,
          category: bank.name,
          difficulty: w.difficulty,
        }));

      allWords = [...allWords, ...bankWords];
    }

    // Si no hay suficientes palabras para la dificultad solicitada, obtener de cualquier dificultad
    if (allWords.length < count && difficulty !== 'any') {
      return getRandomWordsForRoom(roomId, count, 'any');
    }

    // Mezclar las palabras
    allWords.sort(() => Math.random() - 0.5);

    // Devolver el número solicitado de palabras
    return allWords.slice(0, count);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener palabras aleatorias: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener palabras aleatorias');
  }
};

// Método para actualizar estadísticas de un jugador al finalizar una partida
export const updatePlayerStatsAfterGame = async (
  userId: string,
  gameStats: {
    didWin: boolean;
    score: number;
    drawingsCreated: number;
    correctlyGuessedDrawings: number;
    totalGuesses: number;
    correctGuesses: number;
    guessTime: number; // Tiempo promedio en segundos
    fastestGuessTime?: number; // Tiempo más rápido en segundos
    playTime: number; // Tiempo jugado en minutos
    categoriesPlayed: string[];
    playedWithUsers: string[]; // IDs de usuarios con los que jugó
  },
) => {
  try {
    // Buscar o crear estadísticas del jugador
    let playerStats = await GameStatsModel.findOne({ userId });

    if (!playerStats) {
      playerStats = new GameStatsModel({
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        drawingsCreated: 0,
        correctlyGuessedDrawings: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        fastestGuessTime: Infinity,
        averageGuessTime: 0,
        totalPlayTime: 0,
        longestSession: 0,
        wordsCategoriesPlayed: [],
        friendsPlayed: 0,
        achievementsUnlocked: 0,
        rankPoints: 0,
      });
    }

    // Actualizar estadísticas
    playerStats.gamesPlayed += 1;
    playerStats.totalScore += gameStats.score;

    if (gameStats.didWin) {
      playerStats.gamesWon += 1;
    }

    // Actualizar estadísticas de dibujo
    playerStats.drawingsCreated += gameStats.drawingsCreated;
    playerStats.correctlyGuessedDrawings += gameStats.correctlyGuessedDrawings;

    // Actualizar estadísticas de adivinanzas
    playerStats.totalGuesses += gameStats.totalGuesses;
    playerStats.correctGuesses += gameStats.correctGuesses;

    // Actualizar tiempos promedio de adivinanza
    if (gameStats.guessTime > 0) {
      const totalGuessTime = playerStats.averageGuessTime * playerStats.totalGuesses;
      const newTotalGuessTime = totalGuessTime + gameStats.guessTime * gameStats.totalGuesses;
      playerStats.averageGuessTime = newTotalGuessTime / playerStats.totalGuesses;
    }

    // Actualizar tiempo más rápido de adivinanza
    if (gameStats.fastestGuessTime && gameStats.fastestGuessTime < playerStats.fastestGuessTime) {
      playerStats.fastestGuessTime = gameStats.fastestGuessTime;
    }

    // Actualizar tiempo de juego
    playerStats.totalPlayTime += gameStats.playTime;
    if (gameStats.playTime > playerStats.longestSession) {
      playerStats.longestSession = gameStats.playTime;
    }

    // Actualizar categorías jugadas
    for (const category of gameStats.categoriesPlayed) {
      if (!playerStats.wordsCategoriesPlayed.includes(category)) {
        playerStats.wordsCategoriesPlayed.push(category);
      }
    }

    // Actualizar categoría favorita
    const categoryCount: Record<string, number> = {};
    for (const category of playerStats.wordsCategoriesPlayed) {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }

    let maxCount = 0;
    let favoriteCategory = '';
    for (const [category, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = category;
      }
    }

    if (favoriteCategory) {
      playerStats.favoriteCategory = favoriteCategory;
    }

    // Actualizar amigos jugados (jugadores únicos)
    const uniqueFriends = new Set([...gameStats.playedWithUsers]);
    playerStats.friendsPlayed = uniqueFriends.size;

    // Actualizar última vez jugado
    playerStats.lastPlayed = new Date();

    // Guardar cambios
    await playerStats.save();

    return playerStats;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al actualizar estadísticas del jugador: ${error.message}`);
    }
    throw new Error('Error desconocido al actualizar estadísticas del jugador');
  }
};

// Método para obtener ranking de jugadores
export const getPlayerRankings = async (
  limit: number = 10,
  sortBy: 'rankPoints' | 'totalScore' | 'gamesWon' | 'drawingAccuracy' | 'guessAccuracy' = 'rankPoints',
) => {
  try {
    const sortOptions: Record<string, number> = {};
    sortOptions[sortBy] = -1; // Ordenar descendente

    const rankings = await GameStatsModel.find({})
      .sort(sortOptions)
      .limit(limit)
      .select('userId totalScore gamesPlayed gamesWon drawingAccuracy guessAccuracy rankPoints');

    return rankings;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener ranking de jugadores: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener ranking de jugadores');
  }
};

/**
 * Verifica si un código de acceso ya está en uso
 * @param accessCode El código a verificar
 * @returns true si el código ya está en uso, false en caso contrario
 */
export async function isAccessCodeInUse(accessCode: string): Promise<boolean> {
  try {
    // Normalizar el código (trim + uppercase)
    const normalizedCode = normalizeAccessCode(accessCode);

    const existingRoom = await GameRoomModel.findOne({
      accessCode: normalizedCode,
      status: { $nin: [GameRoomStatus.CLOSED, GameRoomStatus.FINISHED] },
    });
    return !!existingRoom;
  } catch (error) {
    console.error('Error checking access code:', error);
    throw error;
  }
}

/**
 * Normaliza un código de acceso (elimina espacios y convierte a mayúsculas)
 * @param accessCode El código a normalizar
 * @returns Código normalizado
 */
export function normalizeAccessCode(accessCode: string): string {
  return accessCode.trim().toUpperCase();
}

/**
 * Genera un código de acceso único que no esté en uso
 * @param length Longitud del código (por defecto 6)
 * @returns Un código de acceso único
 */
export async function generateUniqueAccessCode(length: number = 6): Promise<string> {
  try {
    // Caracteres permitidos (sin caracteres confusos como 0/O, 1/I/l)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let isUnique = false;
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;

    // Intentar hasta maxAttempts veces para encontrar un código único
    while (!isUnique && attempts < maxAttempts) {
      // Generar código aleatorio usando crypto para mayor seguridad
      const randomBytes = crypto.randomBytes(length);
      code = Array.from(randomBytes)
        .map((byte) => chars[byte % chars.length])
        .join('');

      // Verificar si ya está en uso
      const inUse = await isAccessCodeInUse(code);
      if (!inUse) {
        isUnique = true;
        break;
      }

      // Esperar un tiempo exponencial entre intentos para evitar sobrecarga
      attempts++;
      if (attempts < maxAttempts) {
        const backoffMs = Math.pow(2, attempts) * 10;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    if (!isUnique) {
      throw new Error('No se pudo generar un código único después de múltiples intentos');
    }

    return code;
  } catch (error) {
    console.error('Error generating access code:', error);
    throw error;
  }
}

// Almacén en memoria para limitar intentos de acceso (en producción se usaría Redis)
interface AccessAttempt {
  count: number;
  lastAttempt: number;
  blocked: boolean;
  blockExpires?: number;
}

const accessAttempts: Record<string, Record<string, AccessAttempt>> = {};

/**
 * Valida un código de acceso para una sala privada con límite de intentos
 * @param roomId ID de la sala
 * @param accessCode Código de acceso proporcionado
 * @param ipAddress Dirección IP del solicitante (para limitar intentos)
 * @returns La sala si el código es válido
 */
export async function validateRoomAccessCode(
  roomId: string,
  accessCode: string,
  ipAddress: string = 'unknown',
): Promise<IGameRoom> {
  try {
    // Verificar si la IP está bloqueada por demasiados intentos
    const attemptKey = `${roomId}:${ipAddress}`;
    const currentAttempts = accessAttempts[attemptKey] || {};

    // Comprobar si está bloqueado
    if (currentAttempts.blocked && currentAttempts.blockExpires && currentAttempts.blockExpires > Date.now()) {
      const remainingSecs = Math.ceil((currentAttempts.blockExpires - Date.now()) / 1000);
      throw new Error(`Demasiados intentos fallidos. Intente nuevamente en ${remainingSecs} segundos.`);
    }

    // Limpiar bloqueo si ya expiró
    if (currentAttempts.blocked && currentAttempts.blockExpires && currentAttempts.blockExpires <= Date.now()) {
      currentAttempts.blocked = false;
      currentAttempts.count = 0;
    }

    // Normalizar el código
    const normalizedCode = normalizeAccessCode(accessCode);

    const room = await GameRoomModel.findById(roomId);

    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Si la sala es pública, no es necesario validar
    if (room.type === GameRoomType.PUBLIC) {
      return room;
    }

    // Validar código de acceso para salas privadas
    if (!normalizedCode) {
      incrementFailedAttempt(attemptKey);
      throw new Error('Se requiere código de acceso para unirse a esta sala');
    }

    if (room.accessCode !== normalizedCode) {
      incrementFailedAttempt(attemptKey);
      throw new Error('Código de acceso incorrecto');
    }

    // Verificar si el código ha expirado (más de 24h desde creación/última actualización)
    const codeAge = Date.now() - room.updatedAt.getTime();
    const maxCodeAge = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

    if (codeAge > maxCodeAge) {
      incrementFailedAttempt(attemptKey);
      throw new Error('El código de acceso ha expirado. Solicite al anfitrión que genere uno nuevo.');
    }

    // Código válido, reiniciar contador de intentos
    resetAttempts(attemptKey);

    return room;
  } catch (error) {
    console.error(`Error validating access code for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * Incrementa el contador de intentos fallidos y bloquea si es necesario
 * @param key Clave identificadora (roomId:ipAddress)
 */
function incrementFailedAttempt(key: string): void {
  if (!accessAttempts[key]) {
    accessAttempts[key] = {
      count: 0,
      lastAttempt: Date.now(),
      blocked: false,
    };
  }

  const attempt = accessAttempts[key];
  attempt.count += 1;
  attempt.lastAttempt = Date.now();

  // Bloquear después de 5 intentos fallidos
  if (attempt.count >= 5) {
    attempt.blocked = true;
    // Bloquear por 15 minutos
    attempt.blockExpires = Date.now() + 15 * 60 * 1000;
  }
}

/**
 * Reinicia el contador de intentos
 * @param key Clave identificadora (roomId:ipAddress)
 */
function resetAttempts(key: string): void {
  accessAttempts[key] = {
    count: 0,
    lastAttempt: Date.now(),
    blocked: false,
  };
}

/**
 * Regenera el código de acceso para una sala privada existente
 * @param roomId ID de la sala
 * @param userId ID del usuario (debe ser el anfitrión)
 * @returns La sala con el nuevo código de acceso
 */
export async function regenerateAccessCode(roomId: string, userId: string): Promise<IGameRoom> {
  try {
    // Verificar que la sala existe
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Verificar que el usuario es el anfitrión
    if (room.hostId.toString() !== userId) {
      throw new Error('Solo el anfitrión puede regenerar el código de acceso');
    }

    // Verificar que la sala es privada
    if (room.type !== GameRoomType.PRIVATE) {
      throw new Error('Solo las salas privadas pueden tener códigos de acceso');
    }

    // Generar nuevo código único
    const newAccessCode = await generateUniqueAccessCode();

    // Actualizar la sala con el nuevo código
    const updatedRoom = await GameRoomModel.findByIdAndUpdate(roomId, { accessCode: newAccessCode }, { new: true });

    if (!updatedRoom) {
      throw new Error('Error al actualizar el código de acceso');
    }

    // Crear mensaje de sistema para notificar a los jugadores
    await GameMessageModel.createSystemMessage(
      new Types.ObjectId(roomId),
      `El anfitrión ha cambiado el código de acceso de la sala. Nuevo código: ${newAccessCode}`,
    );

    return updatedRoom;
  } catch (error) {
    console.error(`Error regenerating access code for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * Buscar salas por código de acceso (mejorado con normalización)
 * @param accessCode Código de acceso a buscar
 */
export async function findRoomByAccessCode(accessCode: string) {
  try {
    if (!accessCode || accessCode.length < 4) {
      throw new Error('Código de acceso inválido');
    }

    // Normalizar el código
    const normalizedCode = normalizeAccessCode(accessCode);

    const room = await GameRoomModel.findOne({
      accessCode: normalizedCode,
      status: { $nin: [GameRoomStatus.CLOSED, GameRoomStatus.FINISHED] },
    });

    if (!room) {
      throw new Error('No se encontró sala con ese código de acceso');
    }

    return room;
  } catch (error) {
    console.error(`Error finding room by access code ${accessCode}:`, error);
    throw error;
  }
}
