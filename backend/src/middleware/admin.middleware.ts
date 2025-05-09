import { Response, NextFunction } from 'express';
import { IRequestWithUser } from './auth.middleware';
import { UserModel } from '../models';

/**
 * Middleware para verificar si un usuario tiene rol de administrador
 */
export const adminOnly = async (req: IRequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Verificar si el usuario está autenticado
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = req.user.userId;

    // Obtener información completa del usuario desde la base de datos
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el usuario tiene rol de administrador
    if (!user.roles || !user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador' });
    }

    // Si es administrador, continuar con la solicitud
    next();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error desconocido en la verificación de administrador' });
  }
};
