"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
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
        enum: ['local', 'google', 'facebook'], // Asegura que solo estos valores son válidos
        default: 'local',
    },
    providerId: {
        type: String,
        unique: true,
        sparse: true, // Permite múltiples documentos con valor null, pero únicos si no son null
    },
    avatarUrl: {
        type: String,
    },
    roles: {
        type: [String],
        default: ['user'], // Por defecto, todos los usuarios tienen el rol "user"
        enum: ['user', 'admin', 'moderator'], // Roles permitidos
    },
    passwordResetToken: { type: String, select: false }, // No incluir por defecto
    passwordResetExpires: { type: Date, select: false }, // No incluir por defecto
}, { timestamps: true });
// Middleware para encriptar contraseña antes de guardar (se implementará en la siguiente subtarea)
UserSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified('passwordHash') || !this.passwordHash) {
            return next();
        }
        try {
            const salt = yield bcrypt_1.default.genSalt(10);
            this.passwordHash = yield bcrypt_1.default.hash(this.passwordHash, salt);
            next();
        }
        catch (error) {
            // Asegurarse de que error es de tipo Error
            if (error instanceof Error) {
                return next(error);
            }
            return next(new Error('Error hashing password'));
        }
    });
});
// Método para verificar si el usuario tiene un rol específico
UserSchema.methods.hasRole = function (role) {
    return this.roles.includes(role);
};
// Método para verificar si el usuario es administrador
UserSchema.methods.isAdmin = function () {
    return this.roles.includes('admin');
};
exports.UserModel = (0, mongoose_1.model)('User', UserSchema);
