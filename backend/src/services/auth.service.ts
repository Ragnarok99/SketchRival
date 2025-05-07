import { UserModel, IUser, IUserResponse } from "../models/User.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // Para generar tokens de reseteo
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../config/database";
import { sendPasswordResetEmail } from "./email.service";

export interface IAuthResponse {
  user: IUserResponse;
  accessToken: string;
  refreshToken: string;
}

// Definir tipos compatibles con las versiones más recientes de @types/jsonwebtoken
interface TokenPayload {
  userId: string;
  username?: string;
}

const generateTokens = (
  user: IUser,
): { accessToken: string; refreshToken: string } => {
  // Convertir el ID a string de manera segura
  const userId = String(user._id);

  const accessTokenPayload = {
    userId,
    username: user.username,
  };

  // Simplificar con solo dos parámetros
  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET);

  const refreshTokenPayload = { userId };
  const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET);

  return { accessToken, refreshToken };
};

export const registerUser = async (
  userData: Partial<IUser>,
): Promise<IAuthResponse> => {
  if (!userData.passwordHash) {
    throw new Error("Password is required for local registration");
  }
  // El pre-save hook en User.model.ts se encargará del hashing
  const user = new UserModel(userData);
  await user.save();

  const userObject = user.toObject();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...userToReturn } = userObject;

  const tokens = generateTokens(user);

  return {
    user: userToReturn as IUserResponse,
    ...tokens,
  };
};

export const loginUser = async (
  email: string,
  passwordCandidate: string,
): Promise<IAuthResponse | null> => {
  const user = await UserModel.findOne({ email, authProvider: "local" }).select(
    "+passwordHash",
  );
  if (!user || !user.passwordHash) {
    return null; // Usuario no encontrado o no tiene contraseña local
  }

  const isMatch = await bcrypt.compare(passwordCandidate, user.passwordHash);
  if (!isMatch) {
    return null; // Contraseña incorrecta
  }

  const userObject = user.toObject();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...userToReturn } = userObject;

  const tokens = generateTokens(user);

  return {
    user: userToReturn as IUserResponse,
    ...tokens,
  };
  // Lógica de JWT se añadirá después
};

export const forgotPassword = async (email: string): Promise<string | null> => {
  const user = await UserModel.findOne({ email, authProvider: "local" });
  if (!user) {
    return null; // No revelar si el usuario existe o no por seguridad
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token expira en 10 minutos (configurable)
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  await user.save();

  // Enviar el email de recuperación
  const emailSent = await sendPasswordResetEmail(
    email,
    resetToken,
    user.username,
  );

  if (!emailSent) {
    console.error(`Error al enviar email de recuperación a ${email}`);
    // En caso de error con el envío de email, podríamos considerar revertir
    // la generación del token o manejar de otra forma, pero eso depende de los requisitos
  }

  // Solo en desarrollo, imprimir el token para pruebas
  if (process.env.NODE_ENV !== "production") {
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  // Devolvemos el token sin hashear para el enlace del email, o null si no se encontró el usuario
  return resetToken;
};

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<boolean> => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await UserModel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // Token no expirado
  });

  if (!user) {
    return false; // Token inválido o expirado
  }

  // El pre-save hook de Mongoose se encargará de hashear la nueva contraseña
  user.passwordHash = newPassword;
  user.passwordResetToken = undefined; // Limpiar token
  user.passwordResetExpires = undefined; // Limpiar expiración
  await user.save();

  return true;
};

// Implementación de la función refreshToken
export const refreshToken = async (
  token: string,
): Promise<{ accessToken: string } | null> => {
  try {
    // Verificar que el token de refresco sea válido
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    if (!decoded || !decoded.userId) {
      return null;
    }

    // Buscar al usuario para asegurarse de que sigue existiendo
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return null;
    }

    // Generar un nuevo token de acceso
    const accessTokenPayload = {
      userId: String(user._id),
      username: user.username,
    };

    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET);

    return { accessToken };
  } catch (error) {
    // Si hay un error al verificar el token (expirado, inválido, etc.)
    console.error("Error al refrescar el token:", error);
    return null;
  }
};
