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
const express_1 = require("express");
const authController = __importStar(require("../controllers/auth.controller"));
const passport_setup_1 = __importDefault(require("../config/passport.setup"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // Para generar JWT tras OAuth exitoso
const database_1 = require("../config/database");
const auth_middleware_1 = require("../middleware/auth.middleware"); // Importar middleware protect
const validation_middleware_1 = require("../middleware/validation.middleware"); // Importar validaciones
const express_validator_1 = require("express-validator"); // Importar body para resetPasswordValidationRules
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const router = (0, express_1.Router)();
// Usar para evitar errores de tipo con los middlewares
router.post('/register', rate_limit_middleware_1.registerLimiter, (0, validation_middleware_1.registerValidationRules)(), validation_middleware_1.validate, authController.register);
router.post('/login', rate_limit_middleware_1.loginLimiter, (0, validation_middleware_1.loginValidationRules)(), validation_middleware_1.validate, authController.login);
router.post('/logout', authController.logout); // Ruta de logout
// Ruta protegida de ejemplo
router.get('/me', auth_middleware_1.protect, authController.getMe);
// Rutas de Google OAuth
router.get('/google', passport_setup_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport_setup_1.default.authenticate('google', {
    failureRedirect: '/login',
    session: false,
}), // session: false porque usaremos JWT
(req, res) => {
    // Autenticación exitosa, el usuario está en req.user (de la función done de la estrategia)
    const user = req.user; // castear a tu tipo de usuario
    // Generar JWT para el usuario usando String para evitar errores de tipo
    const accessToken = jsonwebtoken_1.default.sign({ userId: String(user._id), username: user.username }, database_1.JWT_SECRET);
    const refreshToken = jsonwebtoken_1.default.sign({ userId: String(user._id) }, database_1.JWT_SECRET);
    // Aquí normalmente redirigirías al frontend con los tokens
    // Por ejemplo, en un query param o guardarlos en una cookie HttpOnly (más seguro)
    // res.redirect(`http://localhost:3000/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    // Por ahora, solo enviamos los tokens en la respuesta para pruebas
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash } = userObject, userToReturn = __rest(userObject, ["passwordHash"]);
    res.json({
        message: 'Google OAuth successful',
        user: userToReturn,
        accessToken,
        refreshToken,
    });
});
const resetPasswordValidationRules = () => {
    return [(0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')];
};
router.post('/forgot-password', rate_limit_middleware_1.forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password/:token', rate_limit_middleware_1.resetPasswordLimiter, resetPasswordValidationRules(), validation_middleware_1.validate, authController.resetPassword);
// Ruta para refrescar el token de acceso
router.post('/refresh-token', authController.refreshTokenHandler);
exports.default = router;
