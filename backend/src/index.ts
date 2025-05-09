import express, { Request, Response } from 'express';
import { connectToDatabase } from './services/database.service';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes'; // Importar rutas de autenticación
import gameRoomsRoutes from './routes/gameRooms.routes'; // Importar rutas de salas de juego
import roomConfigRoutes from './routes/roomConfig.routes'; // Importar rutas de configuración de salas
import privateRoomsRoutes from './routes/privateRooms.routes'; // Importar rutas de salas privadas
import waitingRoomRoutes from './routes/waitingRoom.routes'; // Importar rutas de sala de espera
import statsRoutes from './routes/stats.routes'; // Importar rutas de estadísticas
import wordsRoutes from './routes/words.routes'; // Importar rutas de palabras
import passport from './config/passport.setup'; // Importar configuración de Passport
import { initializeEmailService } from './services/email.service';
import { GameWordBankModel, GameRewardModel } from './models'; // Para inicialización de datos

dotenv.config(); // Cargar variables de entorno

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json()); // Middleware para parsear JSON bodies
app.use(passport.initialize()); // Inicializar Passport

connectToDatabase()
  .then(async () => {
    console.log('Connected to MongoDB');

    // Inicializar servicio de email
    initializeEmailService()
      .then(() => {
        console.log('Email service initialized');
      })
      .catch((err) => {
        console.error('Error initializing email service:', err);
      });

    // Inicializar datos por defecto
    try {
      // Crear categorías de palabras por defecto
      await GameWordBankModel.createDefaultCategories();
      console.log('Default word categories created/verified');

      // Crear recompensas/logros por defecto
      await GameRewardModel.createDefaultRewards();
      console.log('Default rewards created/verified');
    } catch (error) {
      console.error('Error initializing default data:', error);
    }

    app.get('/', (req: Request, res: Response) => {
      res.send('Hello from SketchRival Backend!');
    });

    app.use('/api/auth', authRoutes); // Usar rutas de autenticación
    app.use('/api/rooms', gameRoomsRoutes); // Usar rutas de salas de juego
    app.use('/api/configs', roomConfigRoutes); // Usar rutas de configuración de salas
    app.use('/api/private', privateRoomsRoutes); // Usar rutas de salas privadas
    app.use('/api/waiting-room', waitingRoomRoutes); // Usar rutas de sala de espera
    app.use('/api/stats', statsRoutes); // Usar rutas de estadísticas
    app.use('/api/words', wordsRoutes); // Usar rutas de palabras

    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server due to database connection error:', error);
    process.exit(1);
  });
