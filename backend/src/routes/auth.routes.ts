import { Router, Request, Response, NextFunction } from 'express';
import * as authController from '../controllers/auth.controller';
import passport from '../config/passport.setup';
import jwt from 'jsonwebtoken'; // Para generar JWT tras OAuth exitoso
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/database';
import { IUser, IUserResponse } from '../models/User.model'; // Asumiendo que IUserResponse está aquí o importable
import { protect } from '../middleware/auth.middleware'; // Importar middleware protect
import { registerValidationRules, loginValidationRules, validate } from '../middleware/validation.middleware'; // Importar validaciones
import { body } from 'express-validator'; // Importar body para resetPasswordValidationRules
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// Usar para evitar errores de tipo con los middlewares
router.post('/register', registerLimiter, registerValidationRules(), validate, authController.register);

router.post('/login', loginLimiter, loginValidationRules(), validate, authController.login);

router.post('/logout', authController.logout); // Ruta de logout

// Ruta protegida de ejemplo
router.get('/me', protect, authController.getMe);

// Rutas de Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }), // session: false porque usaremos JWT
  (req: Request, res: Response) => {
    // Autenticación exitosa, el usuario está en req.user (de la función done de la estrategia)
    const user = req.user as IUser; // castear a tu tipo de usuario

    // Generar JWT para el usuario usando String para evitar errores de tipo
    const accessToken = jwt.sign({ userId: String(user._id), username: user.username }, JWT_SECRET);
    const refreshToken = jwt.sign({ userId: String(user._id) }, JWT_SECRET);

    // Aquí normalmente redirigirías al frontend con los tokens
    // Por ejemplo, en un query param o guardarlos en una cookie HttpOnly (más seguro)
    // res.redirect(`http://localhost:3000/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);

    // Por ahora, solo enviamos los tokens en la respuesta para pruebas
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userToReturn } = userObject;

    res.json({
      message: 'Google OAuth successful',
      user: userToReturn as IUserResponse,
      accessToken,
      refreshToken,
    });
  },
);

const resetPasswordValidationRules = () => {
  return [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')];
};

router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

router.post(
  '/reset-password/:token',
  resetPasswordLimiter,
  resetPasswordValidationRules(),
  validate,
  authController.resetPassword,
);

// Ruta para refrescar el token de acceso
router.post('/refresh-token', authController.refreshTokenHandler);

export default router;
