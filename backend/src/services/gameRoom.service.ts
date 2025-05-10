import { GameRoomModel } from '../models';

interface RoomData {
  name: string;
  description?: string;
  maxPlayers?: number;
  isPrivate?: boolean;
  password?: string;
  configId?: string;
}

const gameRoomService = {
  /**
   * Obtener una sala por su ID
   */
  async getRoomById(roomId: string) {
    try {
      const room = await GameRoomModel.findById(roomId)
        .populate('players')
        .populate('hostId', 'username avatar')
        .populate('currentGame');
      return room;
    } catch (error) {
      console.error('Error getting room by id:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva sala
   */
  async createRoom(hostId: string, roomData: RoomData) {
    try {
      const room = new GameRoomModel({
        name: roomData.name,
        description: roomData.description,
        hostId,
        maxPlayers: roomData.maxPlayers || 8,
        isPrivate: roomData.isPrivate || false,
        password: roomData.password,
        config: roomData.configId,
        players: [hostId],
        status: 'waiting',
      });

      await room.save();
      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  /**
   * Obtener salas disponibles
   */
  async getAvailableRooms() {
    try {
      const rooms = await GameRoomModel.find({
        status: 'waiting',
        isPrivate: false,
      })
        .populate('hostId', 'username avatar')
        .populate('players', 'username avatar')
        .populate('config')
        .select('-password');

      return rooms;
    } catch (error) {
      console.error('Error getting available rooms:', error);
      throw error;
    }
  },

  /**
   * Verificar si un jugador puede unirse a una sala
   */
  async canJoinRoom(roomId: string, playerId: string, password?: string) {
    try {
      const room = await this.getRoomById(roomId);

      if (!room) {
        return { canJoin: false, message: 'Sala no encontrada' };
      }

      // Verificar estado de la sala
      if (room.status !== 'waiting') {
        return { canJoin: false, message: 'La sala ya no está disponible' };
      }

      // Verificar si el jugador ya está en la sala
      const playerIds = room.players.map((p: any) => p.toString());
      if (playerIds.includes(playerId)) {
        return { canJoin: true, message: 'Ya estás en esta sala' };
      }

      // Verificar límite de jugadores
      if (room.players.length >= room.maxPlayers) {
        return { canJoin: false, message: 'La sala está llena' };
      }

      // Verificar contraseña si es privada
      if (room.isPrivate && room.password !== password) {
        return { canJoin: false, message: 'Contraseña incorrecta' };
      }

      return { canJoin: true };
    } catch (error) {
      console.error('Error checking join room:', error);
      throw error;
    }
  },
};

export default gameRoomService;
