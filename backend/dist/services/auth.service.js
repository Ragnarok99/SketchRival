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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.resetPassword = exports.forgotPassword = exports.loginUser = exports.registerUser = void 0;
const User_model_1 = require("../models/User.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto")); // Para generar tokens de reseteo
const database_1 = require("../config/database");
const email_service_1 = require("./email.service");
const generateTokens = (user) => {
    // Convertir el ID a string de manera segura
    const userId = String(user._id);
    const accessTokenPayload = {
        userId,
        username: user.username,
    };
    // Simplificar con solo dos parámetros
    const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, database_1.JWT_SECRET);
    const refreshTokenPayload = { userId };
    const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, database_1.JWT_SECRET);
    return { accessToken, refreshToken };
};
const registerUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userData.passwordHash) {
        throw new Error('Password is required for local registration');
    }
    // El pre-save hook en User.model.ts se encargará del hashing
    const user = new User_model_1.UserModel(userData);
    yield user.save();
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash } = userObject, userToReturn = __rest(userObject, ["passwordHash"]);
    const tokens = generateTokens(user);
    return Object.assign({ user: userToReturn }, tokens);
});
exports.registerUser = registerUser;
const loginUser = (email, passwordCandidate) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_model_1.UserModel.findOne({ email, authProvider: 'local' }).select('+passwordHash');
    if (!user || !user.passwordHash) {
        return null; // Usuario no encontrado o no tiene contraseña local
    }
    const isMatch = yield bcrypt_1.default.compare(passwordCandidate, user.passwordHash);
    if (!isMatch) {
        return null; // Contraseña incorrecta
    }
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash } = userObject, userToReturn = __rest(userObject, ["passwordHash"]);
    const tokens = generateTokens(user);
    return Object.assign({ user: userToReturn }, tokens);
    // Lógica de JWT se añadirá después
});
exports.loginUser = loginUser;
const forgotPassword = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_model_1.UserModel.findOne({ email, authProvider: 'local' });
    if (!user) {
        return null; // No revelar si el usuario existe o no por seguridad
    }
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
    // Token expira en 10 minutos (configurable)
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    yield user.save();
    // Enviar el email de recuperación
    const emailSent = yield (0, email_service_1.sendPasswordResetEmail)(email, resetToken, user.username);
    if (!emailSent) {
        console.error(`Error al enviar email de recuperación a ${email}`);
        // En caso de error con el envío de email, podríamos considerar revertir
        // la generación del token o manejar de otra forma, pero eso depende de los requisitos
    }
    // Solo en desarrollo, imprimir el token para pruebas
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Password reset token for ${email}: ${resetToken}`);
    }
    // Devolvemos el token sin hashear para el enlace del email, o null si no se encontró el usuario
    return resetToken;
});
exports.forgotPassword = forgotPassword;
const resetPassword = (resetToken, newPassword) => __awaiter(void 0, void 0, void 0, function* () {
    const hashedToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
    const user = yield User_model_1.UserModel.findOne({
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
    yield user.save();
    return true;
});
exports.resetPassword = resetPassword;
// Implementación de la función refreshToken
const refreshToken = (token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar que el token de refresco sea válido
        const decoded = jsonwebtoken_1.default.verify(token, database_1.JWT_SECRET);
        if (!decoded || !decoded.userId) {
            return null;
        }
        // Buscar al usuario para asegurarse de que sigue existiendo
        const user = yield User_model_1.UserModel.findById(decoded.userId);
        if (!user) {
            return null;
        }
        // Generar un nuevo token de acceso
        const accessTokenPayload = {
            userId: String(user._id),
            username: user.username,
        };
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, database_1.JWT_SECRET);
        return { accessToken };
    }
    catch (error) {
        // Si hay un error al verificar el token (expirado, inválido, etc.)
        console.error('Error al refrescar el token:', error);
        return null;
    }
});
exports.refreshToken = refreshToken;
