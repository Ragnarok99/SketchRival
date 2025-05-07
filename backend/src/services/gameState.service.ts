import { Types } from 'mongoose';
import {
  GameStateModel,
  GameState,
  GameEvent,
  IGameStateData,
  GameRoomModel,
  GameRoomStatus,
  GamePlayerModel,
  PlayerStatus,
} from '../models';
import socketService from './socket.service';

// Tipo para las transiciones del estado
type StateTransition = {
  targetState: GameState;
  action: (data: GameStateContext) => Promise<void>;
};

// Tipo para el mapa de transiciones
type TransitionMap = {
  [key in GameEvent]?: StateTransition;
};

// Mapa completo de estados y sus transiciones
type StateMachine = {
  [key in GameState]?: TransitionMap;
};

// Contexto para acciones de transición
interface GameStateContext {
  roomId: string;
  gameState: IGameStateData;
  payload?: any;
  userId?: string;
}

// Clase para el servicio de la máquina de estados
class GameStateMachineService {
  // Definición de la máquina de estados
  private stateMachine: StateMachine = {
    // Estado: WAITING (sala de espera)
    [GameState.WAITING]: {
      // Evento: Iniciar juego
      [GameEvent.START_GAME]: {
        targetState: GameState.STARTING,
        action: this.handleStartGame.bind(this),
      },
    },

    // Estado: STARTING (iniciando juego)
    [GameState.STARTING]: {
      // Evento: Temporizador terminado
      [GameEvent.TIMER_END]: {
        targetState: GameState.WORD_SELECTION,
        action: this.handleStartWordSelection.bind(this),
      },
      // Evento: Error ocurrido
      [GameEvent.ERROR_OCCURRED]: {
        targetState: GameState.ERROR,
        action: this.handleError.bind(this),
      },
    },

    // Estado: WORD_SELECTION (selección de palabra)
    [GameState.WORD_SELECTION]: {
      // Evento: Palabra seleccionada
      [GameEvent.SELECT_WORD]: {
        targetState: GameState.DRAWING,
        action: this.handleWordSelected.bind(this),
      },
      // Evento: Temporizador terminado (si no eligió palabra)
      [GameEvent.TIMER_END]: {
        targetState: GameState.DRAWING,
        action: this.handleWordSelectionTimeout.bind(this),
      },
    },

    // Estado: DRAWING (dibujando)
    [GameState.DRAWING]: {
      // Evento: Enviar dibujo
      [GameEvent.SUBMIT_DRAWING]: {
        targetState: GameState.GUESSING,
        action: this.handleSubmitDrawing.bind(this),
      },
      // Evento: Temporizador terminado
      [GameEvent.TIMER_END]: {
        targetState: GameState.GUESSING,
        action: this.handleDrawingTimeout.bind(this),
      },
      // Evento: Pausar juego
      [GameEvent.PAUSE_GAME]: {
        targetState: GameState.PAUSED,
        action: this.handlePauseGame.bind(this),
      },
    },

    // Estado: GUESSING (adivinando)
    [GameState.GUESSING]: {
      // Evento: Enviar adivinanza
      [GameEvent.SUBMIT_GUESS]: {
        targetState: GameState.GUESSING, // Se mantiene en el mismo estado
        action: this.handleSubmitGuess.bind(this),
      },
      // Evento: Temporizador terminado
      [GameEvent.TIMER_END]: {
        targetState: GameState.ROUND_END,
        action: this.handleGuessingTimeout.bind(this),
      },
      // Evento: Pausar juego
      [GameEvent.PAUSE_GAME]: {
        targetState: GameState.PAUSED,
        action: this.handlePauseGame.bind(this),
      },
    },

    // Estado: ROUND_END (fin de ronda)
    [GameState.ROUND_END]: {
      // Evento: Siguiente ronda
      [GameEvent.NEXT_ROUND]: {
        targetState: GameState.WORD_SELECTION,
        action: this.handleNextRound.bind(this),
      },
      // Evento: Fin del juego
      [GameEvent.END_GAME]: {
        targetState: GameState.GAME_END,
        action: this.handleEndGame.bind(this),
      },
    },

    // Estado: GAME_END (fin del juego)
    [GameState.GAME_END]: {
      // Evento: Reiniciar juego
      [GameEvent.RESET_GAME]: {
        targetState: GameState.WAITING,
        action: this.handleResetGame.bind(this),
      },
    },

    // Estado: PAUSED (juego pausado)
    [GameState.PAUSED]: {
      // Evento: Reanudar juego
      [GameEvent.RESUME_GAME]: {
        targetState: GameState.DRAWING, // Volverá al estado guardado en previousState
        action: this.handleResumeGame.bind(this),
      },
    },

    // Estado: ERROR (error en el juego)
    [GameState.ERROR]: {
      // Evento: Reiniciar juego
      [GameEvent.RESET_GAME]: {
        targetState: GameState.WAITING,
        action: this.handleResetGame.bind(this),
      },
    },
  };

  // Método principal para procesar eventos
  async processEvent(roomId: string, event: GameEvent, payload?: any, userId?: string): Promise<IGameStateData> {
    try {
      // Obtener el estado actual del juego
      let gameState = await this.getGameState(roomId);

      // Si no existe un estado, crearlo para la sala (solo para START_GAME)
      if (!gameState && event === GameEvent.START_GAME) {
        gameState = await this.createGameState(roomId);
      } else if (!gameState) {
        throw new Error(`No existe estado de juego para la sala: ${roomId}`);
      }

      // Obtener el mapa de transiciones para el estado actual
      const transitions = this.stateMachine[gameState.currentState];
      if (!transitions) {
        throw new Error(`Estado no manejado: ${gameState.currentState}`);
      }

      // Obtener la transición para el evento actual
      const transition = transitions[event];
      if (!transition) {
        throw new Error(`Evento no permitido (${event}) en el estado: ${gameState.currentState}`);
      }

      // Crear contexto para la acción
      const context: GameStateContext = {
        roomId,
        gameState,
        payload,
        userId,
      };

      // Ejecutar la acción asociada a la transición
      await transition.action(context);

      // Antes de la transición, guardar el estado anterior si vamos a PAUSED
      if (transition.targetState === GameState.PAUSED) {
        gameState.previousState = gameState.currentState;
      }

      // Si vamos a reanudar, usar el estado guardado
      let targetState = transition.targetState;
      if (event === GameEvent.RESUME_GAME && gameState.previousState) {
        targetState = gameState.previousState;
        // Limpiar el estado anterior
        gameState.previousState = undefined;
      }

      // Actualizar el estado
      gameState.currentState = targetState;
      gameState.lastUpdated = new Date();

      // Guardar el estado actualizado
      await GameStateModel.findByIdAndUpdate(gameState._id, gameState);

      // Notificar cambio de estado a todos los usuarios
      await this.notifyStateChange(roomId, gameState);

      return gameState;
    } catch (error) {
      console.error(`Error procesando evento ${event} en sala ${roomId}:`, error);

      // Intentar registrar el error en el estado
      try {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        await GameStateModel.findOneAndUpdate(
          { roomId: new Types.ObjectId(roomId) },
          {
            currentState: GameState.ERROR,
            error: {
              message: errorMessage,
              code: 'GAME_STATE_ERROR',
            },
          },
        );
      } catch (updError) {
        console.error('Error al actualizar estado de error:', updError);
      }

      throw error;
    }
  }

  // Obtener el estado actual del juego
  async getGameState(roomId: string): Promise<IGameStateData | null> {
    try {
      const gameState = await GameStateModel.findOne({
        roomId: new Types.ObjectId(roomId),
      }).lean();

      return gameState;
    } catch (error) {
      console.error(`Error obteniendo estado del juego para sala ${roomId}:`, error);
      throw error;
    }
  }

  // Crear un nuevo estado de juego
  private async createGameState(roomId: string): Promise<IGameStateData> {
    try {
      // Obtener datos de la sala para configuración
      const room = await GameRoomModel.findById(roomId);
      if (!room) {
        throw new Error(`Sala no encontrada: ${roomId}`);
      }

      // Crear nuevo estado
      const gameState = await GameStateModel.create({
        roomId: new Types.ObjectId(roomId),
        currentState: GameState.WAITING,
        currentRound: 0,
        totalRounds: room.configuration.totalRounds,
        timeRemaining: 0,
        scores: new Map(),
        lastUpdated: new Date(),
      });

      return gameState.toObject();
    } catch (error) {
      console.error(`Error creando estado de juego para sala ${roomId}:`, error);
      throw error;
    }
  }

  // Notificar cambio de estado a todos los usuarios
  private async notifyStateChange(roomId: string, gameState: IGameStateData): Promise<void> {
    try {
      // Enviar notificación de cambio de estado mediante socket.io
      socketService
        .getIO()
        ?.to(roomId)
        .emit('game:stateChanged', {
          state: gameState.currentState,
          data: {
            currentRound: gameState.currentRound,
            totalRounds: gameState.totalRounds,
            timeRemaining: gameState.timeRemaining,
            currentDrawerId: gameState.currentDrawerId,
            scores: Object.fromEntries(gameState.scores || new Map()),
            // No enviar la palabra actual a todos (solo al dibujante)
          },
        });

      // Si hay un dibujante actual, enviarle la palabra secreta
      if (gameState.currentDrawerId && gameState.currentWord) {
        socketService.sendUserNotification(
          gameState.currentDrawerId.toString(),
          'info',
          `Tu palabra para dibujar es: ${gameState.currentWord}`,
        );
      }
    } catch (error) {
      console.error(`Error notificando cambio de estado en sala ${roomId}:`, error);
    }
  }

  // Métodos para manejar las acciones en cada transición
  // -----------------------------------------------------

  // Iniciar juego
  private async handleStartGame(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Actualizar estado de la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      status: GameRoomStatus.PLAYING,
    });

    // Inicializar datos de juego
    gameState.currentRound = 1;
    gameState.startedAt = new Date();
    gameState.timeRemaining = 5; // 5 segundos de cuenta regresiva

    // Inicializar puntuaciones para todos los jugadores
    const players = await GamePlayerModel.find({ roomId: new Types.ObjectId(roomId) });
    const scores = new Map<string, number>();

    for (const player of players) {
      scores.set(player.userId.toString(), 0);

      // Actualizar estado de jugadores
      await GamePlayerModel.findByIdAndUpdate(player._id, {
        status: PlayerStatus.PLAYING,
        score: 0,
      });
    }

    gameState.scores = scores;

    // Enviar mensaje de sistema
    socketService.sendSystemChatMessage(roomId, '¡El juego ha comenzado! Preparando primera ronda...');
  }

  // Iniciar selección de palabra
  private async handleStartWordSelection(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Determinar quién dibuja en esta ronda
    const players = await GamePlayerModel.find({
      roomId: new Types.ObjectId(roomId),
      status: PlayerStatus.PLAYING,
    });

    if (players.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores para iniciar la ronda');
    }

    // Obtener sala para conocer configuración
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Índice del jugador que dibuja basado en la ronda actual
    const drawerIndex = (gameState.currentRound - 1) % players.length;
    const currentDrawer = players[drawerIndex];

    // Asignar dibujante actual
    gameState.currentDrawerId = currentDrawer.userId;

    // Generar opciones de palabras según configuración
    // Aquí usaríamos el servicio de palabras, por ahora usamos palabras de prueba
    const testWords = ['perro', 'gato', 'casa', 'árbol', 'coche', 'sol', 'luna', 'playa', 'montaña'];
    const wordOptions = [];

    // Seleccionar 3 palabras aleatorias
    const usedIndices = new Set<number>();
    while (wordOptions.length < 3 && usedIndices.size < testWords.length) {
      const randomIndex = Math.floor(Math.random() * testWords.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        wordOptions.push(testWords[randomIndex]);
      }
    }

    gameState.wordOptions = wordOptions;
    gameState.timeRemaining = 15; // 15 segundos para elegir palabra

    // Enviar opciones de palabra solo al dibujante
    socketService.getIO()?.to(currentDrawer.userId.toString()).emit('game:wordSelection', {
      options: wordOptions,
      timeRemaining: gameState.timeRemaining,
    });

    // Notificar a todos quién dibujará
    socketService.sendSystemChatMessage(
      roomId,
      `¡Ronda ${gameState.currentRound}! ${currentDrawer.username} va a dibujar. Esperando selección de palabra...`,
    );
  }

  // Manejar palabra seleccionada
  private async handleWordSelected(context: GameStateContext): Promise<void> {
    const { roomId, gameState, payload, userId } = context;

    // Verificar que quien selecciona es el dibujante
    if (!userId || !gameState.currentDrawerId || userId !== gameState.currentDrawerId.toString()) {
      throw new Error('Solo el dibujante puede seleccionar la palabra');
    }

    // Verificar que la palabra está en las opciones
    const selectedWord = payload.word;
    if (!gameState.wordOptions?.includes(selectedWord)) {
      throw new Error('Palabra seleccionada no válida');
    }

    // Establecer la palabra seleccionada
    gameState.currentWord = selectedWord;

    // Configurar tiempo de dibujo (90 segundos por defecto)
    const room = await GameRoomModel.findById(roomId);
    gameState.timeRemaining = room?.configuration.roundTime || 90;

    // Notificar a todos que se inicia fase de dibujo
    socketService.sendSystemChatMessage(
      roomId,
      `${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`,
    );
  }

  // Manejar timeout en selección de palabra
  private async handleWordSelectionTimeout(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Si no se seleccionó palabra, elegir una aleatoria
    if (!gameState.currentWord && gameState.wordOptions?.length) {
      const randomIndex = Math.floor(Math.random() * gameState.wordOptions.length);
      gameState.currentWord = gameState.wordOptions[randomIndex];
    }

    // Si aún no hay palabra (caso extraño), usar una predeterminada
    if (!gameState.currentWord) {
      gameState.currentWord = 'objeto';
    }

    // Configurar tiempo de dibujo (90 segundos por defecto)
    const room = await GameRoomModel.findById(roomId);
    gameState.timeRemaining = room?.configuration.roundTime || 90;

    // Notificar que se eligió palabra automáticamente
    if (gameState.currentDrawerId) {
      socketService.sendUserNotification(
        gameState.currentDrawerId.toString(),
        'warning',
        `Se eligió automáticamente la palabra: ${gameState.currentWord}`,
      );
    }

    socketService.sendSystemChatMessage(
      roomId,
      `Tiempo de selección agotado. ${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`,
    );
  }

  // Manejar envío de dibujo
  private async handleSubmitDrawing(context: GameStateContext): Promise<void> {
    const { roomId, gameState, payload, userId } = context;

    // Verificar que quien envía es el dibujante
    if (!userId || !gameState.currentDrawerId || userId !== gameState.currentDrawerId.toString()) {
      throw new Error('Solo el dibujante puede enviar el dibujo');
    }

    // Guardar el dibujo
    if (!gameState.drawings) {
      gameState.drawings = [];
    }

    gameState.drawings.push({
      userId: new Types.ObjectId(userId),
      imageData: payload.imageData,
      word: gameState.currentWord || 'desconocido',
      round: gameState.currentRound,
    });

    // Configurar tiempo para adivinar (60 segundos por defecto)
    gameState.timeRemaining = 60;

    // Notificar a todos que comienza fase de adivinanza
    socketService.sendSystemChatMessage(
      roomId,
      `¡El dibujo está listo! Tienen ${gameState.timeRemaining} segundos para adivinar.`,
    );

    // Enviar dibujo a todos los jugadores
    socketService
      .getIO()
      ?.to(roomId)
      .emit('game:drawingSubmitted', {
        drawingId: gameState.drawings.length - 1,
        imageData: payload.imageData,
        drawerId: userId,
        timeRemaining: gameState.timeRemaining,
      });
  }

  // Manejar timeout en dibujo
  private async handleDrawingTimeout(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Si no hay dibujo, crear uno vacío
    if (!gameState.drawings) {
      gameState.drawings = [];
    }

    if (gameState.currentDrawerId) {
      gameState.drawings.push({
        userId: gameState.currentDrawerId,
        imageData:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // 1x1 pixel transparente
        word: gameState.currentWord || 'desconocido',
        round: gameState.currentRound,
      });
    }

    // Configurar tiempo para adivinar (60 segundos por defecto)
    gameState.timeRemaining = 60;

    // Notificar que el tiempo se agotó
    socketService.sendSystemChatMessage(
      roomId,
      `¡Tiempo de dibujo agotado! Pasamos directamente a la fase de adivinanza.`,
    );

    // Notificar al dibujante
    if (gameState.currentDrawerId) {
      socketService.sendUserNotification(
        gameState.currentDrawerId.toString(),
        'warning',
        'Se agotó el tiempo para dibujar.',
      );
    }
  }

  // Manejar envío de adivinanza
  private async handleSubmitGuess(context: GameStateContext): Promise<void> {
    const { roomId, gameState, payload, userId } = context;

    if (!userId) {
      throw new Error('Usuario no identificado');
    }

    // Verificar que no es el dibujante
    if (userId === gameState.currentDrawerId?.toString()) {
      throw new Error('El dibujante no puede adivinar');
    }

    // Verificar si ya existe una adivinanza de este usuario para esta ronda
    const existingGuess = gameState.guesses?.find(
      (g) => g.userId.toString() === userId && g.drawingId.toString() === payload.drawingId,
    );

    if (existingGuess) {
      throw new Error('Ya has enviado una adivinanza para este dibujo');
    }

    // Verificar si la adivinanza es correcta
    const isCorrect = this.checkGuessCorrectness(payload.guess, gameState.currentWord || '');

    // Calcular puntuación (simplificado por ahora)
    let score = 0;
    if (isCorrect) {
      // Puntos base por respuesta correcta
      score = 100;

      // Bonificación por tiempo restante (máx 50 puntos)
      const timeBonus = Math.floor((gameState.timeRemaining / 60) * 50);
      score += timeBonus;
    }

    // Guardar la adivinanza
    if (!gameState.guesses) {
      gameState.guesses = [];
    }

    gameState.guesses.push({
      userId: new Types.ObjectId(userId),
      drawingId: new Types.ObjectId(payload.drawingId),
      guess: payload.guess,
      correct: isCorrect,
      score,
    });

    // Actualizar puntuación del jugador
    if (isCorrect && gameState.scores) {
      const currentScore = gameState.scores.get(userId) || 0;
      gameState.scores.set(userId, currentScore + score);

      // Si adivinó correctamente, también dar puntos al dibujante
      if (gameState.currentDrawerId) {
        const drawerScore = gameState.scores.get(gameState.currentDrawerId.toString()) || 0;
        gameState.scores.set(gameState.currentDrawerId.toString(), drawerScore + 50);
      }

      // Notificar a todos que alguien adivinó correctamente
      socketService.sendSystemChatMessage(roomId, `¡${payload.username || 'Alguien'} ha adivinado correctamente!`);

      // Enviar a todos los nuevos puntajes
      socketService
        .getIO()
        ?.to(roomId)
        .emit('game:scoreUpdated', {
          scores: Object.fromEntries(gameState.scores),
        });

      // Si alguien adivinó, pasar a la siguiente fase
      await this.processEvent(roomId, GameEvent.TIMER_END);
    } else {
      // Enviar mensaje solo al jugador
      socketService.sendUserNotification(
        userId,
        isCorrect ? 'success' : 'error',
        isCorrect ? '¡Correcto! +' + score + ' puntos' : 'Incorrecto, sigue intentando',
      );
    }
  }

  // Verificar si una adivinanza es correcta
  private checkGuessCorrectness(guess: string, word: string): boolean {
    // Implementación simple:
    // - Convertir ambas a minúsculas
    // - Eliminar acentos
    // - Comparar normalizado
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    const normalizedGuess = normalizeText(guess);
    const normalizedWord = normalizeText(word);

    // Comparación exacta por ahora (podría mejorar con algún algoritmo de similitud)
    return normalizedGuess === normalizedWord;
  }

  // Manejar timeout en adivinanza
  private async handleGuessingTimeout(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Enviar mensaje de tiempo agotado
    socketService.sendSystemChatMessage(
      roomId,
      `¡Tiempo de adivinanza agotado! La palabra era: ${gameState.currentWord}`,
    );

    // Configurar tiempo para mostrar resultados de ronda
    gameState.timeRemaining = 10; // 10 segundos para ver resultados
  }

  // Manejar siguiente ronda
  private async handleNextRound(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Incrementar contador de ronda
    gameState.currentRound++;

    // Si alcanzamos el máximo de rondas, terminar juego
    if (gameState.currentRound > gameState.totalRounds) {
      await this.processEvent(roomId, GameEvent.END_GAME);
      return;
    }

    // Limpiar datos de ronda anterior
    gameState.currentWord = undefined;
    gameState.wordOptions = undefined;

    // Enviar mensaje de nueva ronda
    socketService.sendSystemChatMessage(
      roomId,
      `Preparando ronda ${gameState.currentRound} de ${gameState.totalRounds}...`,
    );
  }

  // Manejar fin del juego
  private async handleEndGame(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Calcular ganador
    let winnerId: string | undefined;
    let highestScore = -1;

    gameState.scores?.forEach((score, userId) => {
      if (score > highestScore) {
        highestScore = score;
        winnerId = userId;
      }
    });

    // Obtener nombre del ganador
    let winnerName = 'Desconocido';
    if (winnerId) {
      const winner = await GamePlayerModel.findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(winnerId),
      });
      winnerName = winner?.username || winnerName;
    }

    // Notificar resultados finales
    socketService.sendSystemChatMessage(roomId, `¡Juego terminado! Ganador: ${winnerName} con ${highestScore} puntos.`);

    // Enviar evento de fin de juego con resultados
    socketService
      .getIO()
      ?.to(roomId)
      .emit('game:gameEnded', {
        winner: {
          id: winnerId,
          name: winnerName,
          score: highestScore,
        },
        scores: Object.fromEntries(gameState.scores || new Map()),
      });

    // Actualizar estado de la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      status: GameRoomStatus.FINISHED,
    });

    // Establecer tiempo para mostrar resultados
    gameState.timeRemaining = 30; // 30 segundos para ver resultados finales
  }

  // Manejar pausa del juego
  private async handlePauseGame(context: GameStateContext): Promise<void> {
    const { roomId } = context;

    // Notificar pausa
    socketService.sendSystemChatMessage(roomId, 'El juego ha sido pausado.');
  }

  // Manejar reanudación del juego
  private async handleResumeGame(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Notificar reanudación
    socketService.sendSystemChatMessage(
      roomId,
      `El juego ha sido reanudado. Continuando desde ${gameState.currentState}...`,
    );
  }

  // Manejar error en el juego
  private async handleError(context: GameStateContext): Promise<void> {
    const { roomId, payload } = context;

    const errorMessage = payload?.message || 'Ha ocurrido un error en el juego.';

    // Notificar error
    socketService.sendSystemChatMessage(roomId, `ERROR: ${errorMessage}`);
  }

  // Manejar reinicio del juego
  private async handleResetGame(context: GameStateContext): Promise<void> {
    const { roomId } = context;

    // Eliminar estado actual
    await GameStateModel.findOneAndDelete({ roomId: new Types.ObjectId(roomId) });

    // Actualizar estado de la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      status: GameRoomStatus.WAITING,
      currentRound: 0,
    });

    // Reiniciar estado de los jugadores
    await GamePlayerModel.updateMany(
      { roomId: new Types.ObjectId(roomId) },
      { status: PlayerStatus.WAITING, score: 0 },
    );

    // Notificar reinicio
    socketService.sendSystemChatMessage(roomId, 'El juego ha sido reiniciado.');
  }
}

// Exportar instancia del servicio
export default new GameStateMachineService();
