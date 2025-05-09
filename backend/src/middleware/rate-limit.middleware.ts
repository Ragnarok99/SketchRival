import rateLimit from 'express-rate-limit';

// Configuración base para todos los limitadores
const baseConfig = {
  standardHeaders: true, // Devolver info rate limit en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar los headers `X-RateLimit-*`
  message: {
    message: 'Demasiadas solicitudes, por favor intenta más tarde.',
  },
};

// Limitar solicitudes de autenticación (login, registro, etc.)
export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // Limitar a 50 solicitudes cada 15 minutos
  message: {
    message: 'Demasiados intentos de autenticación, por favor intenta más tarde.',
  },
});

// Limitar solicitudes para creación de salas
export const roomsLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 100, // Limitar a 100 solicitudes cada 10 minutos
});

// Limitar acciones en salas específicas
export const roomActionLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 200, // Limitar a 200 solicitudes cada 5 minutos
});

// Limitar solicitudes de sala de espera
export const waitingRoomLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 200, // Limitar a 200 solicitudes cada 5 minutos
});

// Limitar solicitudes de configuración de salas
export const configLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 100, // Limitar a 100 solicitudes cada 10 minutos
});

// Limitar solicitudes de estado de juego
export const gameStateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 300, // Limitar a 300 solicitudes cada 5 minutos
});

// Limitar solicitudes de estadísticas
export const statsLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // Limitar a 100 solicitudes cada 5 minutos
});

// Limitar solicitudes de palabras
export const wordsLimiter = rateLimit({
  ...baseConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // Limitar a 100 solicitudes cada 5 minutos
});
