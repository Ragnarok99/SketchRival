import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import connectDB from './config/db';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';
import waitingRoomRoutes from './routes/waitingRoom.routes';
import gameStateRoutes from './routes/gameState.routes';
import socketService from './services/socket.service';

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

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/waiting-rooms', waitingRoomRoutes);
app.use('/api/game-state', gameStateRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.IO
socketService.initialize(server);

// Conectar a la base de datos y arrancar el servidor
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor ejecutándose en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
    process.exit(1);
  });

export default server;
