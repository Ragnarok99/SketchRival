import { Types } from 'mongoose';
import { GameRoomModel, GameRoomType, GameRoomStatus } from '../models';
import crypto from 'crypto';

// Duración predeterminada de códigos de acceso (24 horas)
export const DEFAULT_CODE_EXPIRY_HOURS = 24;

// Estructura para las invitaciones
export interface RoomInvitation {
  roomId: string;
  invitedEmail: string;
  invitedUserId?: string; // Opcional, si el usuario está registrado
  invitedByUserId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

// Para almacenar las invitaciones (en memoria para esta implementación)
// En producción, usaríamos una colección en la base de datos
const invitations: RoomInvitation[] = [];

/**
 * Genera un código de acceso único para salas privadas
 * El código será alfanumérico, fácil de leer (sin caracteres confusos) y de longitud fija
 */
export function generateAccessCode(length: number = 6): string {
  // Caracteres seguros (sin I/1, O/0 para evitar confusiones)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  // Generar código aleatorio
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }

  return code;
}

/**
 * Regenera el código de acceso para una sala privada
 * Solo el anfitrión puede regenerar el código
 */
export async function regenerateAccessCode(roomId: string, hostId: string): Promise<string> {
  // Verificar que la sala existe y es del tipo correcto
  const room = await GameRoomModel.findById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada');
  }

  // Solo el anfitrión puede regenerar el código
  if (room.hostId.toString() !== hostId) {
    throw new Error('Solo el anfitrión puede regenerar el código de acceso');
  }

  // Solo se puede regenerar el código de salas privadas
  if (room.type !== GameRoomType.PRIVATE) {
    throw new Error('Solo las salas privadas pueden tener códigos de acceso');
  }

  // Generar nuevo código
  const newCode = generateAccessCode();

  // Establecer nueva fecha de expiración
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + DEFAULT_CODE_EXPIRY_HOURS);

  // Actualizar sala con nuevo código y fecha de expiración
  await GameRoomModel.findByIdAndUpdate(roomId, {
    $set: {
      accessCode: newCode,
      expiresAt: expiryDate,
    },
  });

  return newCode;
}

/**
 * Valida un código de acceso para una sala privada
 */
export async function validateAccessCode(roomId: string, code: string): Promise<boolean> {
  const room = await GameRoomModel.findById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada');
  }

  // Verificar que la sala es privada
  if (room.type !== GameRoomType.PRIVATE) {
    throw new Error('Solo las salas privadas requieren código de acceso');
  }

  // Verificar que el código coincide
  if (room.accessCode !== code) {
    return false;
  }

  // Verificar que la sala no ha expirado
  if (room.expiresAt && room.expiresAt < new Date()) {
    return false;
  }

  return true;
}

/**
 * Cambia el tipo de sala entre pública y privada
 */
export async function toggleRoomVisibility(
  roomId: string,
  hostId: string,
  makePrivate: boolean,
): Promise<{ type: GameRoomType; accessCode?: string }> {
  // Verificar que la sala existe
  const room = await GameRoomModel.findById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada');
  }

  // Solo el anfitrión puede cambiar la visibilidad
  if (room.hostId.toString() !== hostId) {
    throw new Error('Solo el anfitrión puede cambiar la visibilidad de la sala');
  }

  // Determinar el nuevo tipo
  const newType = makePrivate ? GameRoomType.PRIVATE : GameRoomType.PUBLIC;

  // Si se está cambiando a privada, generar código
  let accessCode;
  if (makePrivate) {
    accessCode = generateAccessCode();
  }

  // Actualizar sala
  const updatedRoom = await GameRoomModel.findByIdAndUpdate(
    roomId,
    {
      $set: {
        type: newType,
        accessCode: makePrivate ? accessCode : null,
      },
    },
    { new: true },
  );

  if (!updatedRoom) {
    throw new Error('Error al actualizar la sala');
  }

  return {
    type: updatedRoom.type,
    accessCode: updatedRoom.accessCode,
  };
}

/**
 * Crea una invitación para una sala privada
 */
export async function createRoomInvitation(
  roomId: string,
  invitedEmail: string,
  invitedUserId: string | undefined,
  invitedByUserId: string,
  expiryHours: number = 24,
): Promise<RoomInvitation> {
  // Verificar que la sala existe y es privada
  const room = await GameRoomModel.findById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada');
  }

  if (room.type !== GameRoomType.PRIVATE) {
    throw new Error('Solo se pueden crear invitaciones para salas privadas');
  }

  // Verificar permisos (solo el anfitrión o jugadores de la sala pueden invitar)
  const isHost = room.hostId.toString() === invitedByUserId;
  const isPlayer = room.players.some((p) => p.toString() === invitedByUserId);

  if (!isHost && !isPlayer) {
    throw new Error('No tienes permisos para invitar a otros usuarios a esta sala');
  }

  // Generar token de invitación
  const token = crypto.randomBytes(32).toString('hex');

  // Establecer fecha de expiración
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  // Crear invitación
  const invitation: RoomInvitation = {
    roomId,
    invitedEmail,
    invitedUserId,
    invitedByUserId,
    token,
    expiresAt,
    used: false,
  };

  // Almacenar invitación (en producción, se guardaría en la base de datos)
  invitations.push(invitation);

  return invitation;
}

/**
 * Valida un token de invitación y marca como utilizado
 */
export function validateInvitation(token: string): RoomInvitation | null {
  // Buscar invitación por token
  const invitationIndex = invitations.findIndex((inv) => inv.token === token && !inv.used);

  if (invitationIndex === -1) {
    return null;
  }

  const invitation = invitations[invitationIndex];

  // Verificar que no ha expirado
  if (invitation.expiresAt < new Date()) {
    return null;
  }

  // Marcar como utilizada
  invitations[invitationIndex].used = true;

  return invitation;
}

/**
 * Obtiene todas las salas privadas creadas por un usuario
 */
export async function getUserPrivateRooms(userId: string) {
  return GameRoomModel.find({
    hostId: new Types.ObjectId(userId),
    type: GameRoomType.PRIVATE,
  }).sort({ createdAt: -1 });
}

/**
 * Limpia invitaciones expiradas (para mantenimiento)
 */
export function cleanupExpiredInvitations(): number {
  const now = new Date();
  const initialCount = invitations.length;

  // Filtrar invitaciones no expiradas
  const validInvitations = invitations.filter((inv) => inv.expiresAt > now || inv.used);

  // Reemplazar array con invitaciones válidas
  invitations.length = 0;
  invitations.push(...validInvitations);

  return initialCount - invitations.length;
}

/**
 * Lista invitaciones activas para una sala
 */
export function getRoomInvitations(roomId: string): RoomInvitation[] {
  return invitations.filter((inv) => inv.roomId === roomId && !inv.used && inv.expiresAt > new Date());
}

/**
 * Busca una sala por código de acceso
 */
export async function findRoomByAccessCode(code: string) {
  return GameRoomModel.findOne({
    accessCode: code,
    type: GameRoomType.PRIVATE,
    status: { $ne: GameRoomStatus.CLOSED }, // No incluir salas cerradas
    expiresAt: { $gt: new Date() }, // No incluir salas expiradas
  });
}
