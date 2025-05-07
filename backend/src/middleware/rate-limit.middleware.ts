import rateLimit from 'express-rate-limit';

// Limitar intentos de login para prevenir ataques de fuerza bruta
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limitar a 5 intentos por ventana
  standardHeaders: true, // Devolver info rate limit en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar los headers `X-RateLimit-*`
  message: {
    message: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo más tarde.',
  },
});

// Limitar solicitudes de recuperación de contraseña para prevenir enumeración de cuentas
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 solicitudes por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes de recuperación de contraseña. Por favor, inténtalo de nuevo más tarde.',
  },
});

// Limitar intentos de restablecimiento de contraseña
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 intentos por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiados intentos de restablecimiento de contraseña. Por favor, inténtalo de nuevo más tarde.',
  },
});

// Limitar solicitudes de registro para evitar creación masiva de cuentas
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 registros por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiados intentos de registro. Por favor, inténtalo de nuevo más tarde.',
  },
});

// Limitar solicitudes generales a las operaciones de listar/consultar salas
export const roomsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 solicitudes por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes a la API de salas. Por favor, inténtalo de nuevo más tarde.',
  },
});

// Limitar acciones específicas sobre salas (crear, unirse, actualizar, etc.)
export const roomActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 acciones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas acciones en salas. Por favor, inténtalo de nuevo más tarde.',
  },
});
