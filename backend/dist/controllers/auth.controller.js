"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenHandler = exports.resetPassword = exports.forgotPassword = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/auth.service"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res
                .status(400)
                .send({ message: "Username, email, and password are required" });
        }
        const userData = {
            username,
            email,
            passwordHash: password, // El servicio se encarga del hashing
            authProvider: "local",
        };
        const authResponse = yield authService.registerUser(userData);
        res.status(201).send({
            user: authResponse.user,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
            message: "User registered successfully",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            // Manejo de errores de MongoDB (ej. duplicados)
            if (error.code === 11000) {
                return res
                    .status(409)
                    .send({ message: "Email or username already exists" });
            }
            return res.status(500).send({ message: error.message });
        }
        res.status(500).send({ message: "An unknown error occurred" });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .send({ message: "Email and password are required" });
        }
        const authResponse = yield authService.loginUser(email, password);
        if (!authResponse) {
            return res.status(401).send({ message: "Invalid email or password" });
        }
        res.status(200).send({
            user: authResponse.user,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
            message: "Login successful",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        res.status(500).send({ message: "An unknown error occurred" });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res
            .status(401)
            .send({ message: "Not authorized, user data not found in request" });
    }
    res.status(200).send({
        userId: req.user.userId,
        username: req.user.username,
    });
});
exports.getMe = getMe;
const logout = (req, res) => {
    res.status(200).send({
        message: "Logout successful. Please clear your token on the client-side.",
    });
};
exports.logout = logout;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }
        const resetToken = yield authService.forgotPassword(email);
        if (!resetToken) {
            // No revelar si el email existe o no por seguridad.
            // Simplemente decir que si existe, se enviará un email.
            return res.status(200).send({
                message: "If your email is registered, you will receive a password reset link.",
            });
        }
        // TODO: Enviar el resetToken por email al usuario.
        // Por ahora, lo mostramos en la respuesta para desarrollo.
        res.status(200).send({
            message: "Password reset token generated. Check your email (or console for dev).",
            // NO ENVIAR EL TOKEN EN PRODUCCIÓN ASÍ:
            // resetTokenForDev: resetToken
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        res.status(500).send({ message: "An unknown error occurred" });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const success = yield authService.resetPassword(token, password);
        if (success) {
            res
                .status(200)
                .send({ message: "Password has been reset successfully." });
        }
        else {
            res
                .status(400)
                .send({ message: "Password reset token is invalid or has expired." });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        res.status(500).send({ message: "An unknown error occurred" });
    }
});
exports.resetPassword = resetPassword;
const refreshTokenHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).send({ message: "Refresh token is required" });
        }
        const result = yield authService.refreshToken(refreshToken);
        if (!result) {
            return res.status(401).send({
                message: "Invalid or expired refresh token",
            });
        }
        res.status(200).send({
            accessToken: result.accessToken,
            message: "Access token refreshed successfully",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        res.status(500).send({ message: "An unknown error occurred" });
    }
});
exports.refreshTokenHandler = refreshTokenHandler;
