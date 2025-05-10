import { JWT_SECRET } from './database';

const config = {
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  jwt: {
    secret: JWT_SECRET,
  },
  // Añade otras propiedades globales de configuración aquí si es necesario
};

export default config;
