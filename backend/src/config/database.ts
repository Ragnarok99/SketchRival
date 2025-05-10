// Importar dotenv y cargar las variables de entorno
import dotenv from 'dotenv';
dotenv.config();

export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sketchrival';
export const DB_NAME = 'sketchrival';
export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeydontusethisinprod';
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Google OAuth Credentials
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

// OpenAI API Key
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; // Dejar vacío si no está en .env para evitar errores
