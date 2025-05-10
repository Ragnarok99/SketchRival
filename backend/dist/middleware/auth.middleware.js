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
exports.adminOnly = exports.protect = exports.protectRoute = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const User_model_1 = require("../models/User.model");
// En vez de exportar 'protect' directamente, exportamos 'protectRoute' que es compatible con Express
const protectRoute = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // El tipo del payload decodificado debe coincidir con AuthenticatedUser
            const decoded = jsonwebtoken_1.default.verify(token, database_1.JWT_SECRET);
            // Verificar si el usuario existe y obtener información adicional como roles
            const user = yield User_model_1.UserModel.findById(decoded.userId);
            if (!user) {
                return res.status(401).send({ message: 'Usuario no encontrado' });
            }
            // Extender el objeto decoded para incluir información sobre roles
            req.user = Object.assign(Object.assign({}, decoded), { isAdmin: user.roles.includes('admin') });
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(401).send({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).send({ message: 'Not authorized, no token' });
    }
});
exports.protectRoute = protectRoute;
// Alias para mantener compatibilidad con código existente
exports.protect = exports.protectRoute;
// Middleware para verificar si el usuario es administrador
const adminOnly = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    }
    else {
        res.status(403).send({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};
exports.adminOnly = adminOnly;
