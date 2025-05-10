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
      // Intentar obtener palabras del servicio
      const wordService = require('./wordBank.service').default;
      const difficulty = room.configuration?.difficulty || 'medium';
      gameState.wordOptions = await wordService.getRandomWords(3, difficulty);
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

    // Establecer tiempo para selección de palabra
    const selectionTime = 15; // Por defecto 15 segundos
    gameState.timeRemaining = selectionTime;

    // Guardar tiempo máximo como propiedad temporal
    (gameState as any)._currentPhaseMaxTime = selectionTime;

    // Enviar opciones de palabra solo al dibujante
    socketService.getIO()?.to(currentDrawer.userId.toString()).emit('game:wordSelection', {
      options: gameState.wordOptions,
      timeRemaining: gameState.timeRemaining,
      maxTime: selectionTime,
    });

    // Notificar a todos quién dibujará
    socketService.sendSystemMessage(
      roomId,
      `¡Ronda ${gameState.currentRound} de ${gameState.totalRounds}! ${currentDrawer.username} va a dibujar. Esperando selección de palabra...`,
    );

    // Iniciar el temporizador para la fase de selección de palabra
    this.startPhaseTimer(roomId, gameState.timeRemaining);
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

    gameState.drawings.push({
      userId: new Types.ObjectId(userId),
      imageData: payload.imageData,
      word: gameState.currentWord || 'desconocido',
      round: gameState.currentRound,
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

    // Enviar mensaje de tiempo agotado
    socketService.sendSystemMessage(roomId, `¡Tiempo de adivinanza agotado! La palabra era: ${gameState.currentWord}`);

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
        podium: rankedPlayers.slice(0, 3), // Top 3 jugadores
        allPlayers: rankedPlayers, // Todos los jugadores ordenados
        scores: Object.fromEntries(gameState.scores || new Map()),
      });

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

  // Método para iniciar y gestionar temporizadores de fase
  private startPhaseTimer(roomId: string, duration: number, callback?: () => void) {
    // Intervalo para actualizar cada segundo
    const timer = setInterval(() => {
      duration--;

      // Emitir actualización de tiempo a todos los jugadores
      socketService.getIO()?.to(roomId).emit('game:timeUpdate', {
        timeRemaining: duration,
      });

      // Si el tiempo llega a cero
      if (duration <= 0) {
        clearInterval(timer);
        if (callback) callback();
      }
    }, 1000);

    // Guardar referencia al timer para poder cancelarlo si es necesario
    // (idealmente en una estructura que permita tener múltiples timers para diferentes salas)
    // Por simplicidad, aquí no implementamos la cancelación
  }
}

// Exportar instancia del servicio
export default new GameStateMachineService();
