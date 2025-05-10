import { Server } from 'socket.io';

// Cliente de Socket.io
let io: Server | null = null;

const socketService = {
  // Inicializar socket.io con el servidor HTTP
  initialize(httpServer: any) {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Configurar listeners de conexión
    io.on('connection', (socket) => {
      console.log(`Usuario conectado: ${socket.id}`);

      // Desconexión
      socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
      });
    });

    console.log('Socket.IO initialized successfully');
    return io;
  },

  // Obtener la instancia de socket.io
  getIO() {
    if (!io) {
      console.warn('Socket.IO no ha sido inicializado');
    }
    return io;
  },

  // Enviar notificación a una sala específica
  notifyRoom(roomId: string, event: string, data: any) {
    if (!io) return;
    io.to(roomId).emit(event, data);
  },

  // Enviar mensaje del sistema al chat de una sala
  sendSystemChatMessage(roomId: string, message: string) {
    if (!io) return;
    io.to(roomId).emit('chat:message', {
      type: 'system',
      content: message,
      timestamp: new Date(),
    });
  },

  // Enviar notificación a un usuario específico
  sendUserNotification(userId: string, type: string, message: string) {
    if (!io) return;
    io.to(userId).emit('notification', {
      type,
      message,
      timestamp: new Date(),
    });
  },

  // Notificar que el juego ha comenzado
  notifyGameStarted(roomId: string, gameRoom: any) {
    if (!io) return;
    io.to(roomId).emit('game:started', {
      roomId,
      gameId: gameRoom.currentGame,
      timestamp: new Date(),
    });
  },
};

export default socketService;
