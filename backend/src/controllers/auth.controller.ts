import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { IUser } from "../models/User.model";
import { IRequestWithUser } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .send({ message: "Username, email, and password are required" });
    }

    const userData: Partial<IUser> = {
      username,
      email,
      passwordHash: password, // El servicio se encarga del hashing
      authProvider: "local",
    };

    const authResponse = await authService.registerUser(userData);
    res.status(201).send({
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      message: "User registered successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      // Manejo de errores de MongoDB (ej. duplicados)
      if ((error as any).code === 11000) {
        return res
          .status(409)
          .send({ message: "Email or username already exists" });
      }
      return res.status(500).send({ message: error.message });
    }
    res.status(500).send({ message: "An unknown error occurred" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }

    const authResponse = await authService.loginUser(email, password);
    if (!authResponse) {
      return res.status(401).send({ message: "Invalid email or password" });
    }
    res.status(200).send({
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      message: "Login successful",
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({ message: error.message });
    }
    res.status(500).send({ message: "An unknown error occurred" });
  }
};

export const getMe = async (req: IRequestWithUser, res: Response) => {
  if (!req.user) {
    return res
      .status(401)
      .send({ message: "Not authorized, user data not found in request" });
  }
  res.status(200).send({
    userId: req.user.userId,
    username: req.user.username,
  });
};

export const logout = (req: Request, res: Response) => {
  res.status(200).send({
    message: "Logout successful. Please clear your token on the client-side.",
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const resetToken = await authService.forgotPassword(email);

    if (!resetToken) {
      // No revelar si el email existe o no por seguridad.
      // Simplemente decir que si existe, se enviará un email.
      return res.status(200).send({
        message:
          "If your email is registered, you will receive a password reset link.",
      });
    }

    // TODO: Enviar el resetToken por email al usuario.
    // Por ahora, lo mostramos en la respuesta para desarrollo.
    res.status(200).send({
      message:
        "Password reset token generated. Check your email (or console for dev).",
      // NO ENVIAR EL TOKEN EN PRODUCCIÓN ASÍ:
      // resetTokenForDev: resetToken
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({ message: error.message });
    }
    res.status(500).send({ message: "An unknown error occurred" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).send({ message: "New password is required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .send({ message: "Password must be at least 6 characters long" });
    }

    const success = await authService.resetPassword(token, password);

    if (success) {
      res
        .status(200)
        .send({ message: "Password has been reset successfully." });
    } else {
      res
        .status(400)
        .send({ message: "Password reset token is invalid or has expired." });
    }
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({ message: error.message });
    }
    res.status(500).send({ message: "An unknown error occurred" });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).send({ message: "Refresh token is required" });
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result) {
      return res.status(401).send({
        message: "Invalid or expired refresh token",
      });
    }

    res.status(200).send({
      accessToken: result.accessToken,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({ message: error.message });
    }
    res.status(500).send({ message: "An unknown error occurred" });
  }
};
