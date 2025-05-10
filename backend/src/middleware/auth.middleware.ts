import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/database';
import { UserModel } from '../models/User.model';

// Extender la interfaz Request de Express para incluir la propiedad user
// Esta interfaz debe coincidir con lo que se pone en el payload del JWT
export interface AuthenticatedUser {
  userId: string;
  username: string;
  isAdmin?: boolean; // Indicador de si el usuario es administrador
  // Podrías añadir más campos si los incluyes en el payload del JWT
}

export interface IRequestWithUser extends Request {
  user?: AuthenticatedUser;
}

// En vez de exportar 'protect' directamente, exportamos 'protectRoute' que es compatible con Express
export const protectRoute = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      // El tipo del payload decodificado debe coincidir con AuthenticatedUser
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;

      // Verificar si el usuario existe y obtener información adicional como roles
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).send({ message: 'Usuario no encontrado' });
      }

      // Extender el objeto decoded para incluir información sobre roles
      (req as IRequestWithUser).user = {
        ...decoded,
        isAdmin: user.roles.includes('admin'), // Verificar si el usuario es administrador
      };

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).send({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).send({ message: 'Not authorized, no token' });
  }
};

// Alias para mantener compatibilidad con código existente
export const protect = protectRoute;

// Middleware para verificar si el usuario es administrador
export const adminOnly = (req: IRequestWithUser, res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).send({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};
