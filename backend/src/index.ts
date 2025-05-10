import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import passport from './config/passport.setup';
import socketService from './services/socket.service';

// Importar rutas
import authRoutes from './routes/auth.routes';
import waitingRoomRoutes from './routes/waitingRoom.routes';
import gameStateRoutes from './routes/gameState.routes';
import gameRoomsRoutes from './routes/gameRooms.routes';
import roomConfigRoutes from './routes/roomConfig.routes';
import privateRoomsRoutes from './routes/privateRooms.routes';
import statsRoutes from './routes/stats.routes';
import wordsRoutes from './routes/words.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import seasonRoutes from './routes/season.routes';

// Importar servicios
import { initializeEmailService } from './services/email.service';
import openAIService from './services/openAIService';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(passport.initialize());

// Ruta raíz
app.get('/', (req: Request, res: Response) => {
  res.send('SketchRival Backend API');
});

// Configurar rutas
app.use('/api/auth', authRoutes);
app.use('/api/game-state', gameStateRoutes);
app.use('/api/waiting-room', waitingRoomRoutes);
app.use('/api/rooms', gameRoomsRoutes);
app.use('/api/configs', roomConfigRoutes);
app.use('/api/private', privateRoomsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/seasons', seasonRoutes);

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.IO
socketService.initialize(server);

// Configurar conexión MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sketchrival';

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Intento de conexión a MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Inicializar servicio de email
    try {
      await initializeEmailService();
      console.log('Email service initialized');
    } catch (err) {
      console.error('Error initializing email service:', err);
    }

    // Inicializar datos por defecto
    try {
      // Inicializar categorías de palabras y recompensas
      console.log('Initializing default data...');
      // Aquí podrías inicializar datos por defecto si es necesario
      // await initializeDefaultWordCategories();
      // await initializeDefaultRewards();

      // Probar conexión con OpenAI
      await openAIService.testConnection();
    } catch (error) {
      console.error('Error initializing default data or OpenAI service:', error);
    }

    // Iniciar el servidor
    server.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);

    // Si falla la conexión a MongoDB, iniciar en modo offline
    console.log('Starting server in offline mode (without database)...');

    // Iniciar el servidor de todos modos para que las rutas estén disponibles
    server.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT} in OFFLINE mode (no database)`);
    });
  }
};

// Iniciar el servidor
startServer();

export default server;
