import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string; // Opcional si usan OAuth y no tienen contraseña local
  authProvider: "local" | "google" | "facebook"; // Ejemplo de proveedores
  providerId?: string; // ID del proveedor OAuth
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Podríamos añadir más campos aquí: roles, stats, etc.
}

// Interfaz para el objeto de usuario que se devuelve al cliente (sin passwordHash)
export interface IUserResponse {
  _id: string;
  username: string;
  email: string;
  authProvider: "local" | "google" | "facebook";
  providerId?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      // Puedes añadir una validación de regex para el email aquí
    },
    passwordHash: {
      type: String,
      select: false, // No incluir por defecto en las consultas
    },
    authProvider: {
      type: String,
      required: true,
      enum: ["local", "google", "facebook"], // Asegura que solo estos valores son válidos
      default: "local",
    },
    providerId: {
      type: String,
      unique: true,
      sparse: true, // Permite múltiples documentos con valor null, pero únicos si no son null
    },
    avatarUrl: {
      type: String,
    },
    passwordResetToken: { type: String, select: false }, // No incluir por defecto
    passwordResetExpires: { type: Date, select: false }, // No incluir por defecto
  },
  { timestamps: true }, // Añade createdAt y updatedAt automáticamente
);

// Middleware para encriptar contraseña antes de guardar (se implementará en la siguiente subtarea)
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    // Asegurarse de que error es de tipo Error
    if (error instanceof Error) {
      return next(error);
    }
    return next(new Error("Error hashing password"));
  }
});

export const UserModel = model<IUser>("User", UserSchema);
