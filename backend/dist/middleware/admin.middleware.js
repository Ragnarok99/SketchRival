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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const models_1 = require("../models");
/**
 * Middleware para verificar si un usuario tiene rol de administrador
 */
const adminOnly = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar si el usuario está autenticado
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const userId = req.user.userId;
        // Obtener información completa del usuario desde la base de datos
        const user = yield models_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Verificar si el usuario tiene rol de administrador
        if (!user.roles || !user.roles.includes('admin')) {
            return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador' });
        }
        // Si es administrador, continuar con la solicitud
        next();
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error desconocido en la verificación de administrador' });
    }
});
exports.adminOnly = adminOnly;
