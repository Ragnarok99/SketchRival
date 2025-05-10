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
import leaderboardService from './leaderboardService';

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

// Estructura para gestionar temporizadores por sala
interface RoomTimer {
  timerId: NodeJS.Timeout;
  startTime: number; // Timestamp cuando inició el timer
  duration: number; // Duración total en segundos
  endTime: number; // Timestamp cuando finalizará
  remainingTime: number; // Tiempo restante en segundos
  isPaused: boolean; // Si el timer está pausado
  pausedAt?: number; // Timestamp cuando se pausó
  callback?: () => void; // Callback a ejecutar al finalizar
}

// Clase para el servicio de la máquina de estados
class GameStateMachineService {
  // Mapa para almacenar los temporizadores activos por sala
  private roomTimers: Map<string, RoomTimer> = new Map();

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

      // Manejar la pausa de temporizadores si es necesario
      if (event === GameEvent.PAUSE_GAME) {
        this.pauseTimer(roomId);
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
        // Reanudar temporizador si existía
        this.resumeTimer(roomId);
        // Limpiar el estado anterior
        gameState.previousState = undefined;
      }

      // Actualizar el estado
      gameState.currentState = targetState;
      gameState.lastUpdated = new Date();

      // Guardar el estado actualizado - necesario convertir a Document debido al _id
      const gameStateId = (gameState as any)._id;
      await GameStateModel.findByIdAndUpdate(gameStateId, gameState);

      // Notificar cambio de estado a todos los usuarios
      await this.notifyStateChange(roomId, gameState);

      return gameState;
    } catch (error) {
      console.error(`Error procesando evento ${event} en sala ${roomId}:`, error);

      // Si hay un timer activo para esta sala y ocurre un error, detenerlo
      this.stopTimer(roomId);

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

      if (!gameState) return null;

      // Convertir el objeto plano de la consulta a la interfaz esperada
      // Esto maneja la incompatibilidad entre Record<string, number> y Map
      if (gameState.scores && !(gameState.scores instanceof Map)) {
        const scoresMap = new Map();
        Object.entries(gameState.scores as Record<string, number>).forEach(([key, value]) => {
          scoresMap.set(key, value);
        });
        gameState.scores = scoresMap;
      }

      return gameState as IGameStateData;
    } catch (error) {
      console.error(`Error al obtener estado del juego para sala ${roomId}:`, error);
      return null;
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
      // Convertir Map a objeto para enviar por socket
      const scoresObject: Record<string, number> = {};
      if (gameState.scores instanceof Map) {
        for (const [key, value] of gameState.scores.entries()) {
          scoresObject[key] = value;
        }
      } else if (gameState.scores && typeof gameState.scores === 'object') {
        // Si ya es un objeto, copiarlo directamente
        Object.assign(scoresObject, gameState.scores);
      }

      // Preparar datos de evaluación de IA para enviar (si existe)
      const iaEvaluationData = gameState.currentRoundIaEvaluation
        ? {
            isCorrect: gameState.currentRoundIaEvaluation.isCorrect,
            justification: gameState.currentRoundIaEvaluation.justification,
          }
        : undefined;

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
            scores: scoresObject,
            currentRoundIaEvaluation: iaEvaluationData,
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

    // Obtener jugadores listos
    const readyPlayers = await GamePlayerModel.find({
      roomId: new Types.ObjectId(roomId),
      isReady: true,
    });

    if (readyPlayers.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores listos para iniciar');
    }

    // Actualizar estado de jugadores a PLAYING
    await GamePlayerModel.updateMany(
      {
        roomId: new Types.ObjectId(roomId),
        isReady: true,
      },
      {
        status: PlayerStatus.PLAYING,
      },
    );

    // Actualizar estado de la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      status: GameRoomStatus.PLAYING,
    });

    // Inicializar puntuaciones
    gameState.scores = new Map();
    for (const player of readyPlayers) {
      gameState.scores.set(player.userId.toString(), 0);
    }

    // Establecer primera ronda
    gameState.currentRound = 1;
    gameState.startedAt = new Date();
    gameState.timeRemaining = 5; // 5 segundos de countdown

    // Enviar mensaje de sistema
    socketService.sendSystemMessage(roomId, '¡El juego ha comenzado! Preparando primera ronda...');
  }

  // Iniciar selección de palabra
  private async handleStartWordSelection(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Determinar quién dibuja en esta ronda
    const players = await GamePlayerModel.find({
      roomId: new Types.ObjectId(roomId),
      status: PlayerStatus.PLAYING,
    }).sort({ createdAt: 1 }); // Ordenar por orden de unión

    if (players.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores para iniciar la ronda');
    }

    // Obtener sala para conocer configuración
    const room = await GameRoomModel.findById(roomId);
    if (!room) {
      throw new Error('Sala no encontrada');
    }

    // Índice del jugador que dibuja basado en la ronda actual
    // Utilizando un índice de jugador actual para mantener la rotación
    // Almacenamos este valor como propiedad del objeto, no como parte del modelo
    let currentPlayerIndex = 0;
    if (gameState.currentRound === 1) {
      // Primera ronda, inicializar el índice
      currentPlayerIndex = 0;
    } else {
      // Recuperar el índice actual (guardado como propiedad temporal)
      // y avanzar al siguiente jugador
      const lastPlayerIndex = (gameState as any)._currentPlayerIndex || 0;
      currentPlayerIndex = (lastPlayerIndex + 1) % players.length;
    }

    // Guardar el índice para la próxima ronda (como propiedad temporal)
    (gameState as any)._currentPlayerIndex = currentPlayerIndex;

    const currentDrawer = players[currentPlayerIndex];

    // Asignar dibujante actual
    gameState.currentDrawerId = currentDrawer.userId;

    // Generar opciones de palabras usando el wordBankService
    try {
      // Obtener categorías configuradas en la sala si existen
      const categories = room.configuration?.drawingCategories || [];
      const difficulty = room.configuration?.difficulty || 'medium';
      const wordCount = 3; // Número fijo de opciones de palabras

      // Intentar obtener palabras del servicio de banco de palabras
      const wordService = require('./wordBank.service').default;

      if (categories.length > 0) {
        // Si hay categorías específicas configuradas, elegir una aleatoriamente
        const randomCategoryIndex = Math.floor(Math.random() * categories.length);
        const selectedCategory = categories[randomCategoryIndex];

        // Intentar obtener palabras de la categoría específica
        try {
          const allCategories = await wordService.getAllCategories();
          const category = allCategories.find((c: any) => c.name.toLowerCase() === selectedCategory.toLowerCase());

          if (category) {
            gameState.wordOptions = await wordService.getRandomWordsFromCategory(
              category._id.toString(),
              wordCount,
              difficulty as 'easy' | 'medium' | 'hard',
            );
          } else {
            // Si no se encuentra la categoría, usar palabras generales
            gameState.wordOptions = await wordService.getRandomWords(
              wordCount,
              difficulty as 'easy' | 'medium' | 'hard',
            );
          }
        } catch (error) {
          console.error('Error al obtener palabras de la categoría seleccionada:', error);
          // Fallback: Usar palabras generales
          gameState.wordOptions = await wordService.getRandomWords(wordCount, difficulty as 'easy' | 'medium' | 'hard');
        }
      } else {
        // Si no hay categorías específicas, obtener palabras aleatorias generales
        gameState.wordOptions = await wordService.getRandomWords(wordCount, difficulty as 'easy' | 'medium' | 'hard');
      }
    } catch (error) {
      // Si falla, usar palabras predeterminadas
      console.error('Error al obtener palabras:', error);
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
    }

    // Establecer tiempo para selección de palabra (15 segundos por defecto)
    // Usamos un tiempo fijo para la selección de palabras ya que no hay un campo específico en la configuración
    const selectionTime = 15; // Tiempo fijo de 15 segundos para selección de palabra
    gameState.timeRemaining = selectionTime;

    // Guardar tiempo máximo como propiedad temporal
    (gameState as any)._currentPhaseMaxTime = selectionTime;

    // Iniciar el temporizador para la fase de selección de palabra
    this.startPhaseTimer(roomId, selectionTime);

    // Enviar opciones de palabra solo al dibujante
    socketService.getIO()?.to(currentDrawer.userId.toString()).emit('game:wordSelection', {
      options: gameState.wordOptions,
      timeRemaining: selectionTime,
      maxTime: selectionTime,
    });

    // Notificar a todos quién dibujará
    socketService.sendSystemMessage(
      roomId,
      `¡Ronda ${gameState.currentRound} de ${gameState.totalRounds}! ${currentDrawer.username} va a dibujar. Esperando selección de palabra...`,
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

    // Limpiar opciones de palabras para no enviarlas a todos los jugadores
    // (Las opciones solo son relevantes durante la fase de selección)
    delete gameState.wordOptions;

    // Configurar tiempo de dibujo (90 segundos por defecto)
    const room = await GameRoomModel.findById(roomId);
    const drawingTime = room?.configuration?.roundTime || 90;
    gameState.timeRemaining = drawingTime;

    // Guardar información del tiempo máximo de la fase
    const maxTime = drawingTime;
    (gameState as any)._currentPhaseMaxTime = maxTime;

    // Iniciar temporizador para la fase de dibujo
    this.startPhaseTimer(roomId, drawingTime);

    // Enviar la palabra completa solo al dibujante (información privada)
    socketService.getIO()?.to(userId).emit('game:wordToDrawConfirmed', {
      word: selectedWord,
      timeRemaining: drawingTime,
      maxTime,
    });

    // Generar versión ofuscada de la palabra para los demás jugadores (guiones bajos)
    const wordLength = selectedWord.length;
    const hiddenWord = '_ '.repeat(wordLength).trim();

    // Enviar notificación a todos sobre la longitud/formato de la palabra
    socketService.sendSystemMessage(roomId, `¡Palabra seleccionada! Tiene ${wordLength} letras: ${hiddenWord}`);

    // Notificar a todos que se inicia fase de dibujo
    socketService.sendSystemMessage(
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

    // Limpiar opciones de palabras para no enviarlas a todos los jugadores
    delete gameState.wordOptions;

    // Configurar tiempo de dibujo (90 segundos por defecto)
    const room = await GameRoomModel.findById(roomId);
    const drawingTime = room?.configuration?.roundTime || 90;
    gameState.timeRemaining = drawingTime;

    // Guardar información del tiempo máximo de la fase
    const maxTime = drawingTime;
    (gameState as any)._currentPhaseMaxTime = maxTime;

    // Iniciar temporizador para la fase de dibujo
    this.startPhaseTimer(roomId, drawingTime);

    // Notificar que se eligió palabra automáticamente
    if (gameState.currentDrawerId) {
      // Enviar la palabra completa solo al dibujante (información privada)
      socketService.getIO()?.to(gameState.currentDrawerId.toString()).emit('game:wordToDrawConfirmed', {
        word: gameState.currentWord,
        timeRemaining: drawingTime,
        maxTime,
        autoSelected: true,
      });

      socketService.sendUserNotification(
        gameState.currentDrawerId.toString(),
        'warning',
        `Se eligió automáticamente la palabra: ${gameState.currentWord}`,
      );
    }

    // Generar versión ofuscada de la palabra para mostrar a todos
    const wordLength = gameState.currentWord.length;
    const hiddenWord = '_ '.repeat(wordLength).trim();

    // Enviar notificación a todos sobre la longitud/formato de la palabra
    socketService.sendSystemMessage(
      roomId,
      `¡Palabra seleccionada automáticamente! Tiene ${wordLength} letras: ${hiddenWord}`,
    );

    socketService.sendSystemMessage(
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

    // Validar y procesar la imagen antes de guardarla
    let processedImageData = payload.imageData;

    // Verificar si es una imagen válida
    if (
      !processedImageData ||
      typeof processedImageData !== 'string' ||
      !processedImageData.startsWith('data:image/')
    ) {
      throw new Error('Formato de imagen no válido');
    }

    // Guardar con datos procesados
    gameState.drawings.push({
      userId: new Types.ObjectId(userId),
      imageData: processedImageData,
      word: gameState.currentWord || 'desconocido',
      round: gameState.currentRound,
      createdAt: new Date(), // Usar createdAt en lugar de timestamp para coincidir con el tipo
    });

    // Configurar tiempo para adivinar (60 segundos por defecto)
    gameState.timeRemaining = 60;

    // Notificar a todos que comienza fase de adivinanza
    socketService.sendSystemMessage(
      roomId,
      `¡El dibujo está listo! Tienen ${gameState.timeRemaining} segundos para adivinar.`,
    );

    // Enviar dibujo a todos los jugadores
    socketService
      .getIO()
      ?.to(roomId)
      .emit('game:drawingSubmitted', {
        drawingId: gameState.drawings.length - 1,
        imageData: processedImageData,
        drawerId: userId,
        timeRemaining: gameState.timeRemaining,
        round: gameState.currentRound,
      });

    // Actualizar estado del juego en el servidor para reconexiones
    const gameStateUpdate = {
      gameState: 'GUESSING',
      drawings: gameState.drawings.length,
      currentDrawing: gameState.drawings.length - 1,
      currentDrawerId: userId,
      timeRemaining: gameState.timeRemaining,
    };

    socketService.updateRoomState(roomId, gameStateUpdate);
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
    socketService.sendSystemMessage(roomId, `¡Tiempo de dibujo agotado! Pasamos directamente a la fase de adivinanza.`);

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

    if (!userId || !payload.guess || !gameState.currentWord) {
      throw new Error('Datos de adivinanza incompletos');
    }

    // Comprobar si la adivinanza es correcta
    const guess = payload.guess;
    const isCorrect = this.checkGuessCorrectness(guess, gameState.currentWord);

    // Calcular puntuación (más puntos si es más rápido)
    const timeLeft = gameState.timeRemaining; // Tiempo restante en segundos
    const maxPoints = 100; // Puntos máximos posibles
    const score = isCorrect ? Math.max(Math.floor((timeLeft / 60) * maxPoints), 10) : 0;

    // Guardar la adivinanza
    if (!gameState.guesses) {
      gameState.guesses = [];
    }

    if (gameState.drawings && gameState.drawings.length > 0) {
      const currentDrawing = gameState.drawings[gameState.drawings.length - 1];

      gameState.guesses.push({
        userId: new Types.ObjectId(userId),
        drawingId: new Types.ObjectId(), // ID temporal
        guess,
        correct: isCorrect,
        score,
      });
    }

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
      socketService.sendSystemMessage(roomId, `¡${payload.username || 'Alguien'} ha adivinado correctamente!`);

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

    // Importar el servicio de OpenAI
    const openAIService = require('./openAIService').default;

    // Enviar mensaje de tiempo agotado
    socketService.sendSystemMessage(roomId, `¡Tiempo de adivinanza agotado! La palabra era: ${gameState.currentWord}`);

    // Evaluar el dibujo con OpenAI si hay un dibujo disponible
    if (gameState.drawings && gameState.drawings.length > 0 && gameState.currentWord) {
      try {
        const currentDrawing = gameState.drawings[gameState.drawings.length - 1];

        // Solo evaluar si corresponde a la ronda actual y tiene datos de imagen
        if (currentDrawing.round === gameState.currentRound && currentDrawing.imageData) {
          console.log(`Evaluando dibujo con OpenAI para la palabra "${gameState.currentWord}"...`);

          // Llamar a la API de OpenAI para evaluar el dibujo
          const evaluationResult = await openAIService.evaluateDrawingWithOpenAI(
            currentDrawing.imageData,
            gameState.currentWord,
          );

          // Guardar el resultado de la evaluación en el estado del juego
          gameState.currentRoundIaEvaluation = evaluationResult;

          console.log(`Evaluación de OpenAI recibida: ${evaluationResult.isCorrect ? 'Correcto' : 'Incorrecto'}`);
        }
      } catch (error) {
        console.error('Error al evaluar el dibujo con OpenAI:', error);
        // No bloquear el flujo del juego si hay un error en la evaluación
      }
    }

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
    // No reseteamos currentDrawerId para mantener la rotación

    // Enviar mensaje de nueva ronda
    socketService.sendSystemMessage(
      roomId,
      `Preparando ronda ${gameState.currentRound} de ${gameState.totalRounds}...`,
    );

    // Configurar tiempo para transición a la siguiente ronda
    const transitionTime = 5; // 5 segundos de transición
    gameState.timeRemaining = transitionTime;

    // Guardar tiempo máximo como propiedad temporal
    (gameState as any)._currentPhaseMaxTime = transitionTime;

    // Notificar a todos de la transición
    socketService.getIO()?.to(roomId).emit('game:stateUpdated', {
      currentState: gameState.currentState,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      timeRemaining: gameState.timeRemaining,
      currentPhaseMaxTime: transitionTime,
    });

    // Iniciar temporizador para transición a selección de palabra
    this.startPhaseTimer(roomId, gameState.timeRemaining, () => {
      this.processEvent(roomId, GameEvent.TIMER_END); // Esto llevará a WORD_SELECTION
    });
  }

  // Manejar fin del juego
  private async handleEndGame(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Calcular top 3 jugadores con mayor puntuación
    type PlayerScore = { userId: string; username: string; score: number; rank: number };
    const rankedPlayers: PlayerScore[] = [];

    if (gameState.scores) {
      // Convertir map a array y ordenar por puntuación
      const scoresMap = gameState.scores as Map<string, number>;
      for (const [userId, score] of scoresMap.entries()) {
        // Obtener nombre del jugador
        const player = await GamePlayerModel.findOne({
          roomId: new Types.ObjectId(roomId),
          userId: new Types.ObjectId(userId),
        });

        rankedPlayers.push({
          userId,
          username: player?.username || 'Jugador desconocido',
          score,
          rank: 0, // Se asignará después
        });
      }

      // Ordenar de mayor a menor
      rankedPlayers.sort((a, b) => b.score - a.score);

      // Asignar rangos (podium)
      rankedPlayers.forEach((player, index) => {
        player.rank = index + 1;
      });
    }

    // Obtener al ganador (jugador con mayor puntuación)
    const winner = rankedPlayers.length > 0 ? rankedPlayers[0] : null;

    // Notificar resultados finales
    if (winner) {
      socketService.sendSystemMessage(
        roomId,
        `¡Juego terminado! Ganador: ${winner.username} con ${winner.score} puntos.`,
      );
    } else {
      socketService.sendSystemMessage(roomId, '¡Juego terminado!');
    }

    // Preparar el objeto de scores para el evento
    const scoresForEvent: Record<string, number> = {};
    if (gameState.scores instanceof Map) {
      for (const [key, value] of gameState.scores.entries()) {
        scoresForEvent[key] = value;
      }
    } else if (gameState.scores && typeof gameState.scores === 'object') {
      // Si ya es un objeto (aunque el tipo IGameStateData espera Map, podría venir así de DB a veces si no se reconstruye bien)
      Object.assign(scoresForEvent, gameState.scores);
    } else {
      // Fallback si scores es undefined o un tipo inesperado
      console.warn(`gameState.scores tenía un tipo inesperado en handleEndGame para la sala ${roomId}`);
    }

    // Enviar evento de fin de juego con resultados
    socketService
      .getIO()
      ?.to(roomId)
      .emit('game:gameEnded', {
        winner: winner
          ? {
              id: winner.userId,
              name: winner.username,
              score: winner.score,
              rank: winner.rank,
            }
          : null,
        podium: rankedPlayers.slice(0, 3),
        allPlayers: rankedPlayers,
        scores: scoresForEvent, // Usar el objeto convertido
      });

    // Actualizar Leaderboard
    for (const player of rankedPlayers) {
      try {
        // Asumimos que player.userId es el ObjectId del usuario
        // y player.score es la puntuación final de la partida.
        // El nivel no se está rastreando actualmente en GamePlayerModel, por lo que se omite.
        await leaderboardService.updatePlayerScore(
          player.userId.toString(), // Asegurarse que sea string si el servicio lo espera así
          player.username,
          player.score, // Esta es la puntuación final de la partida para este jugador
          undefined, // Nivel omitido por ahora
          'global', // Categoría global por defecto
        );
      } catch (error) {
        console.error(`Error actualizando leaderboard para ${player.username} (ID: ${player.userId}):`, error);
      }
    }

    // Actualizar estado de la sala
    await GameRoomModel.findByIdAndUpdate(roomId, {
      status: GameRoomStatus.FINISHED,
    });

    // Establecer tiempo para mostrar resultados
    const resultsTime = 30; // 30 segundos para ver resultados finales
    gameState.timeRemaining = resultsTime;

    // Guardar tiempo máximo como propiedad temporal
    (gameState as any)._currentPhaseMaxTime = resultsTime;

    // Iniciar temporizador para la fase de resultados
    this.startPhaseTimer(roomId, gameState.timeRemaining);
  }

  // Manejar pausa del juego
  private async handlePauseGame(context: GameStateContext): Promise<void> {
    const { roomId } = context;

    // Notificar pausa
    socketService.sendSystemMessage(roomId, 'El juego ha sido pausado.');
  }

  // Manejar reanudación del juego
  private async handleResumeGame(context: GameStateContext): Promise<void> {
    const { roomId, gameState } = context;

    // Notificar reanudación
    socketService.sendSystemMessage(
      roomId,
      `El juego ha sido reanudado. Continuando desde ${gameState.currentState}...`,
    );
  }

  // Manejar error en el juego
  private async handleError(context: GameStateContext): Promise<void> {
    const { roomId, payload } = context;

    const errorMessage = payload?.message || 'Ha ocurrido un error en el juego.';

    // Notificar error
    socketService.sendSystemMessage(roomId, `ERROR: ${errorMessage}`);
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
    socketService.sendSystemMessage(roomId, 'El juego ha sido reiniciado.');
  }

  // NUEVOS MÉTODOS PARA GESTIÓN DE TEMPORIZADORES
  // ---------------------------------------------

  // Método principal para iniciar y gestionar temporizadores de fase
  private startPhaseTimer(roomId: string, duration: number, callback?: () => void): void {
    // Detener cualquier temporizador existente para esta sala
    this.stopTimer(roomId);

    // Calcular timestamps para seguimiento del temporizador
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    // Crear intervalo para actualizar cada segundo
    const timerId = setInterval(() => {
      // Obtener el timer actual
      const timer = this.roomTimers.get(roomId);

      // Si no hay timer o está pausado, salir
      if (!timer || timer.isPaused) return;

      // Calcular tiempo restante basado en timestamp actual
      const now = Date.now();
      const elapsedMs = now - startTime;
      const remainingSecs = Math.max(0, Math.ceil((duration * 1000 - elapsedMs) / 1000));

      // Actualizar tiempo restante en el objeto timer
      timer.remainingTime = remainingSecs;
      this.roomTimers.set(roomId, timer);

      // Emitir actualización de tiempo a todos los jugadores
      socketService.getIO()?.to(roomId).emit('game:timeUpdate', {
        timeRemaining: remainingSecs,
        startTime: startTime,
        endTime: endTime,
      });

      // Si el tiempo llega a cero
      if (remainingSecs <= 0) {
        this.stopTimer(roomId);
        if (callback) callback();
      }
    }, 1000);

    // Guardar referencia al timer
    this.roomTimers.set(roomId, {
      timerId,
      startTime,
      duration,
      endTime,
      remainingTime: duration,
      isPaused: false,
    });

    // Actualizar el estado del juego con los valores de tiempo
    this.updateGameStateTime(roomId, duration);
  }

  // Actualizar tiempo en el estado del juego
  private async updateGameStateTime(
    roomId: string,
    timeRemaining: number,
    currentPhaseMaxTime?: number,
  ): Promise<void> {
    try {
      // Si no se proporciona currentPhaseMaxTime, usar el valor de timeRemaining
      const maxTime = currentPhaseMaxTime || timeRemaining;

      await GameStateModel.findOneAndUpdate(
        { roomId: new Types.ObjectId(roomId) },
        {
          $set: {
            timeRemaining,
            currentPhaseMaxTime: maxTime,
          },
        },
      );

      // Notificar a los clientes sobre la actualización del tiempo
      socketService.getIO()?.to(roomId).emit('game:stateUpdated', {
        timeRemaining,
        currentPhaseMaxTime: maxTime,
      });
    } catch (error) {
      console.error(`Error actualizando tiempo en estado del juego para sala ${roomId}:`, error);
    }
  }

  // Pausar el temporizador de una sala
  private pauseTimer(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (!timer || timer.isPaused) return;

    // Detener el intervalo
    clearInterval(timer.timerId);

    // Marcar como pausado y guardar tiempo de pausa
    timer.isPaused = true;
    timer.pausedAt = Date.now();

    // Actualizar en el mapa
    this.roomTimers.set(roomId, timer);

    console.log(`Timer pausado para sala ${roomId}. Tiempo restante: ${timer.remainingTime}s`);
  }

  // Reanudar el temporizador de una sala
  private resumeTimer(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (!timer || !timer.isPaused || !timer.pausedAt) return;

    // Calcular el tiempo transcurrido durante la pausa
    const pauseDuration = (Date.now() - timer.pausedAt) / 1000;

    // Actualizar los timestamps
    timer.startTime = Date.now() - (timer.duration - timer.remainingTime) * 1000;
    timer.endTime = timer.startTime + timer.remainingTime * 1000;

    // Iniciar un nuevo intervalo
    const newTimerId = setInterval(() => {
      // Verificar si el timer sigue existiendo y no está pausado
      const currentTimer = this.roomTimers.get(roomId);
      if (!currentTimer || currentTimer.isPaused) return;

      // Calcular tiempo restante
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.ceil((currentTimer.endTime - now) / 1000));

      // Actualizar tiempo restante
      currentTimer.remainingTime = remainingSecs;
      this.roomTimers.set(roomId, currentTimer);

      // Emitir actualización
      socketService.getIO()?.to(roomId).emit('game:timeUpdate', {
        timeRemaining: remainingSecs,
        startTime: currentTimer.startTime,
        endTime: currentTimer.endTime,
      });

      // Si el tiempo llega a cero
      if (remainingSecs <= 0) {
        this.stopTimer(roomId);
        if (currentTimer.callback) currentTimer.callback();
      }
    }, 1000);

    // Actualizar el timer
    timer.timerId = newTimerId;
    timer.isPaused = false;
    timer.pausedAt = undefined;

    // Actualizar en el mapa
    this.roomTimers.set(roomId, timer);

    // Actualizar el estado del juego
    this.updateGameStateTime(roomId, timer.remainingTime, timer.duration);

    console.log(`Timer reanudado para sala ${roomId}. Tiempo restante: ${timer.remainingTime}s`);
  }

  // Detener y eliminar un temporizador
  private stopTimer(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (!timer) return;

    // Detener el intervalo
    clearInterval(timer.timerId);

    // Eliminar del mapa
    this.roomTimers.delete(roomId);

    console.log(`Timer detenido para sala ${roomId}`);
  }

  // Obtener información sobre el temporizador de una sala
  public getTimerInfo(roomId: string): { timeRemaining: number; isPaused: boolean; totalDuration: number } | null {
    const timer = this.roomTimers.get(roomId);
    if (!timer) return null;

    return {
      timeRemaining: timer.remainingTime,
      isPaused: timer.isPaused,
      totalDuration: timer.duration,
    };
  }
}

// Exportar instancia del servicio
export default new GameStateMachineService();
