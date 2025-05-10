"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const socket_service_1 = __importDefault(require("./socket.service"));
// Clase para el servicio de la máquina de estados
class GameStateMachineService {
    constructor() {
        // Mapa para almacenar los temporizadores activos por sala
        this.roomTimers = new Map();
        // Definición de la máquina de estados
        this.stateMachine = {
            // Estado: WAITING (sala de espera)
            [models_1.GameState.WAITING]: {
                // Evento: Iniciar juego
                [models_1.GameEvent.START_GAME]: {
                    targetState: models_1.GameState.STARTING,
                    action: this.handleStartGame.bind(this),
                },
            },
            // Estado: STARTING (iniciando juego)
            [models_1.GameState.STARTING]: {
                // Evento: Temporizador terminado
                [models_1.GameEvent.TIMER_END]: {
                    targetState: models_1.GameState.WORD_SELECTION,
                    action: this.handleStartWordSelection.bind(this),
                },
                // Evento: Error ocurrido
                [models_1.GameEvent.ERROR_OCCURRED]: {
                    targetState: models_1.GameState.ERROR,
                    action: this.handleError.bind(this),
                },
            },
            // Estado: WORD_SELECTION (selección de palabra)
            [models_1.GameState.WORD_SELECTION]: {
                // Evento: Palabra seleccionada
                [models_1.GameEvent.SELECT_WORD]: {
                    targetState: models_1.GameState.DRAWING,
                    action: this.handleWordSelected.bind(this),
                },
                // Evento: Temporizador terminado (si no eligió palabra)
                [models_1.GameEvent.TIMER_END]: {
                    targetState: models_1.GameState.DRAWING,
                    action: this.handleWordSelectionTimeout.bind(this),
                },
            },
            // Estado: DRAWING (dibujando)
            [models_1.GameState.DRAWING]: {
                // Evento: Enviar dibujo
                [models_1.GameEvent.SUBMIT_DRAWING]: {
                    targetState: models_1.GameState.GUESSING,
                    action: this.handleSubmitDrawing.bind(this),
                },
                // Evento: Temporizador terminado
                [models_1.GameEvent.TIMER_END]: {
                    targetState: models_1.GameState.GUESSING,
                    action: this.handleDrawingTimeout.bind(this),
                },
                // Evento: Pausar juego
                [models_1.GameEvent.PAUSE_GAME]: {
                    targetState: models_1.GameState.PAUSED,
                    action: this.handlePauseGame.bind(this),
                },
            },
            // Estado: GUESSING (adivinando)
            [models_1.GameState.GUESSING]: {
                // Evento: Enviar adivinanza
                [models_1.GameEvent.SUBMIT_GUESS]: {
                    targetState: models_1.GameState.GUESSING, // Se mantiene en el mismo estado
                    action: this.handleSubmitGuess.bind(this),
                },
                // Evento: Temporizador terminado
                [models_1.GameEvent.TIMER_END]: {
                    targetState: models_1.GameState.ROUND_END,
                    action: this.handleGuessingTimeout.bind(this),
                },
                // Evento: Pausar juego
                [models_1.GameEvent.PAUSE_GAME]: {
                    targetState: models_1.GameState.PAUSED,
                    action: this.handlePauseGame.bind(this),
                },
            },
            // Estado: ROUND_END (fin de ronda)
            [models_1.GameState.ROUND_END]: {
                // Evento: Siguiente ronda
                [models_1.GameEvent.NEXT_ROUND]: {
                    targetState: models_1.GameState.WORD_SELECTION,
                    action: this.handleNextRound.bind(this),
                },
                // Evento: Fin del juego
                [models_1.GameEvent.END_GAME]: {
                    targetState: models_1.GameState.GAME_END,
                    action: this.handleEndGame.bind(this),
                },
            },
            // Estado: GAME_END (fin del juego)
            [models_1.GameState.GAME_END]: {
                // Evento: Reiniciar juego
                [models_1.GameEvent.RESET_GAME]: {
                    targetState: models_1.GameState.WAITING,
                    action: this.handleResetGame.bind(this),
                },
            },
            // Estado: PAUSED (juego pausado)
            [models_1.GameState.PAUSED]: {
                // Evento: Reanudar juego
                [models_1.GameEvent.RESUME_GAME]: {
                    targetState: models_1.GameState.DRAWING, // Volverá al estado guardado en previousState
                    action: this.handleResumeGame.bind(this),
                },
            },
            // Estado: ERROR (error en el juego)
            [models_1.GameState.ERROR]: {
                // Evento: Reiniciar juego
                [models_1.GameEvent.RESET_GAME]: {
                    targetState: models_1.GameState.WAITING,
                    action: this.handleResetGame.bind(this),
                },
            },
        };
    }
    // Método principal para procesar eventos
    processEvent(roomId, event, payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener el estado actual del juego
                let gameState = yield this.getGameState(roomId);
                // Si no existe un estado, crearlo para la sala (solo para START_GAME)
                if (!gameState && event === models_1.GameEvent.START_GAME) {
                    gameState = yield this.createGameState(roomId);
                }
                else if (!gameState) {
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
                if (event === models_1.GameEvent.PAUSE_GAME) {
                    this.pauseTimer(roomId);
                }
                // Crear contexto para la acción
                const context = {
                    roomId,
                    gameState,
                    payload,
                    userId,
                };
                // Ejecutar la acción asociada a la transición
                yield transition.action(context);
                // Antes de la transición, guardar el estado anterior si vamos a PAUSED
                if (transition.targetState === models_1.GameState.PAUSED) {
                    gameState.previousState = gameState.currentState;
                }
                // Si vamos a reanudar, usar el estado guardado
                let targetState = transition.targetState;
                if (event === models_1.GameEvent.RESUME_GAME && gameState.previousState) {
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
                const gameStateId = gameState._id;
                yield models_1.GameStateModel.findByIdAndUpdate(gameStateId, gameState);
                // Notificar cambio de estado a todos los usuarios
                yield this.notifyStateChange(roomId, gameState);
                return gameState;
            }
            catch (error) {
                console.error(`Error procesando evento ${event} en sala ${roomId}:`, error);
                // Si hay un timer activo para esta sala y ocurre un error, detenerlo
                this.stopTimer(roomId);
                // Intentar registrar el error en el estado
                try {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    yield models_1.GameStateModel.findOneAndUpdate({ roomId: new mongoose_1.Types.ObjectId(roomId) }, {
                        currentState: models_1.GameState.ERROR,
                        error: {
                            message: errorMessage,
                            code: 'GAME_STATE_ERROR',
                        },
                    });
                }
                catch (updError) {
                    console.error('Error al actualizar estado de error:', updError);
                }
                throw error;
            }
        });
    }
    // Obtener el estado actual del juego
    getGameState(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gameState = yield models_1.GameStateModel.findOne({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                }).lean();
                if (!gameState)
                    return null;
                // Convertir el objeto plano de la consulta a la interfaz esperada
                // Esto maneja la incompatibilidad entre Record<string, number> y Map
                if (gameState.scores && !(gameState.scores instanceof Map)) {
                    const scoresMap = new Map();
                    Object.entries(gameState.scores).forEach(([key, value]) => {
                        scoresMap.set(key, value);
                    });
                    gameState.scores = scoresMap;
                }
                return gameState;
            }
            catch (error) {
                console.error(`Error al obtener estado del juego para sala ${roomId}:`, error);
                return null;
            }
        });
    }
    // Crear un nuevo estado de juego
    createGameState(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener datos de la sala para configuración
                const room = yield models_1.GameRoomModel.findById(roomId);
                if (!room) {
                    throw new Error(`Sala no encontrada: ${roomId}`);
                }
                // Crear nuevo estado
                const gameState = yield models_1.GameStateModel.create({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                    currentState: models_1.GameState.WAITING,
                    currentRound: 0,
                    totalRounds: room.configuration.totalRounds,
                    timeRemaining: 0,
                    scores: new Map(),
                    lastUpdated: new Date(),
                });
                return gameState.toObject();
            }
            catch (error) {
                console.error(`Error creando estado de juego para sala ${roomId}:`, error);
                throw error;
            }
        });
    }
    // Notificar cambio de estado a todos los usuarios
    notifyStateChange(roomId, gameState) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Convertir Map a objeto para enviar por socket
                const scoresObject = {};
                if (gameState.scores) {
                    for (const [key, value] of gameState.scores.entries()) {
                        scoresObject[key] = value;
                    }
                }
                // Enviar notificación de cambio de estado mediante socket.io
                (_a = socket_service_1.default
                    .getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:stateChanged', {
                    state: gameState.currentState,
                    data: {
                        currentRound: gameState.currentRound,
                        totalRounds: gameState.totalRounds,
                        timeRemaining: gameState.timeRemaining,
                        currentDrawerId: gameState.currentDrawerId,
                        scores: scoresObject,
                        // No enviar la palabra actual a todos (solo al dibujante)
                    },
                });
                // Si hay un dibujante actual, enviarle la palabra secreta
                if (gameState.currentDrawerId && gameState.currentWord) {
                    socket_service_1.default.sendUserNotification(gameState.currentDrawerId.toString(), 'info', `Tu palabra para dibujar es: ${gameState.currentWord}`);
                }
            }
            catch (error) {
                console.error(`Error notificando cambio de estado en sala ${roomId}:`, error);
            }
        });
    }
    // Métodos para manejar las acciones en cada transición
    // -----------------------------------------------------
    // Iniciar juego
    handleStartGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, gameState } = context;
            // Obtener jugadores listos
            const readyPlayers = yield models_1.GamePlayerModel.find({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                isReady: true,
            });
            if (readyPlayers.length < 2) {
                throw new Error('Se necesitan al menos 2 jugadores listos para iniciar');
            }
            // Actualizar estado de jugadores a PLAYING
            yield models_1.GamePlayerModel.updateMany({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                isReady: true,
            }, {
                status: models_1.PlayerStatus.PLAYING,
            });
            // Actualizar estado de la sala
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: models_1.GameRoomStatus.PLAYING,
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
            socket_service_1.default.sendSystemMessage(roomId, '¡El juego ha comenzado! Preparando primera ronda...');
        });
    }
    // Iniciar selección de palabra
    handleStartWordSelection(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { roomId, gameState } = context;
            // Determinar quién dibuja en esta ronda
            const players = yield models_1.GamePlayerModel.find({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                status: models_1.PlayerStatus.PLAYING,
            }).sort({ createdAt: 1 }); // Ordenar por orden de unión
            if (players.length < 2) {
                throw new Error('Se necesitan al menos 2 jugadores para iniciar la ronda');
            }
            // Obtener sala para conocer configuración
            const room = yield models_1.GameRoomModel.findById(roomId);
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
            }
            else {
                // Recuperar el índice actual (guardado como propiedad temporal)
                // y avanzar al siguiente jugador
                const lastPlayerIndex = gameState._currentPlayerIndex || 0;
                currentPlayerIndex = (lastPlayerIndex + 1) % players.length;
            }
            // Guardar el índice para la próxima ronda (como propiedad temporal)
            gameState._currentPlayerIndex = currentPlayerIndex;
            const currentDrawer = players[currentPlayerIndex];
            // Asignar dibujante actual
            gameState.currentDrawerId = currentDrawer.userId;
            // Generar opciones de palabras usando el wordBankService
            try {
                // Obtener categorías configuradas en la sala si existen
                const categories = ((_a = room.configuration) === null || _a === void 0 ? void 0 : _a.drawingCategories) || [];
                const difficulty = ((_b = room.configuration) === null || _b === void 0 ? void 0 : _b.difficulty) || 'medium';
                const wordCount = 3; // Número fijo de opciones de palabras
                // Intentar obtener palabras del servicio de banco de palabras
                const wordService = require('./wordBank.service').default;
                if (categories.length > 0) {
                    // Si hay categorías específicas configuradas, elegir una aleatoriamente
                    const randomCategoryIndex = Math.floor(Math.random() * categories.length);
                    const selectedCategory = categories[randomCategoryIndex];
                    // Intentar obtener palabras de la categoría específica
                    try {
                        const allCategories = yield wordService.getAllCategories();
                        const category = allCategories.find((c) => c.name.toLowerCase() === selectedCategory.toLowerCase());
                        if (category) {
                            gameState.wordOptions = yield wordService.getRandomWordsFromCategory(category._id.toString(), wordCount, difficulty);
                        }
                        else {
                            // Si no se encuentra la categoría, usar palabras generales
                            gameState.wordOptions = yield wordService.getRandomWords(wordCount, difficulty);
                        }
                    }
                    catch (error) {
                        console.error('Error al obtener palabras de la categoría seleccionada:', error);
                        // Fallback: Usar palabras generales
                        gameState.wordOptions = yield wordService.getRandomWords(wordCount, difficulty);
                    }
                }
                else {
                    // Si no hay categorías específicas, obtener palabras aleatorias generales
                    gameState.wordOptions = yield wordService.getRandomWords(wordCount, difficulty);
                }
            }
            catch (error) {
                // Si falla, usar palabras predeterminadas
                console.error('Error al obtener palabras:', error);
                const testWords = ['perro', 'gato', 'casa', 'árbol', 'coche', 'sol', 'luna', 'playa', 'montaña'];
                const wordOptions = [];
                // Seleccionar 3 palabras aleatorias
                const usedIndices = new Set();
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
            gameState._currentPhaseMaxTime = selectionTime;
            // Iniciar el temporizador para la fase de selección de palabra
            this.startPhaseTimer(roomId, selectionTime);
            // Enviar opciones de palabra solo al dibujante
            (_c = socket_service_1.default.getIO()) === null || _c === void 0 ? void 0 : _c.to(currentDrawer.userId.toString()).emit('game:wordSelection', {
                options: gameState.wordOptions,
                timeRemaining: selectionTime,
                maxTime: selectionTime,
            });
            // Notificar a todos quién dibujará
            socket_service_1.default.sendSystemMessage(roomId, `¡Ronda ${gameState.currentRound} de ${gameState.totalRounds}! ${currentDrawer.username} va a dibujar. Esperando selección de palabra...`);
        });
    }
    // Manejar palabra seleccionada
    handleWordSelected(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { roomId, gameState, payload, userId } = context;
            // Verificar que quien selecciona es el dibujante
            if (!userId || !gameState.currentDrawerId || userId !== gameState.currentDrawerId.toString()) {
                throw new Error('Solo el dibujante puede seleccionar la palabra');
            }
            // Verificar que la palabra está en las opciones
            const selectedWord = payload.word;
            if (!((_a = gameState.wordOptions) === null || _a === void 0 ? void 0 : _a.includes(selectedWord))) {
                throw new Error('Palabra seleccionada no válida');
            }
            // Establecer la palabra seleccionada
            gameState.currentWord = selectedWord;
            // Limpiar opciones de palabras para no enviarlas a todos los jugadores
            // (Las opciones solo son relevantes durante la fase de selección)
            delete gameState.wordOptions;
            // Configurar tiempo de dibujo (90 segundos por defecto)
            const room = yield models_1.GameRoomModel.findById(roomId);
            const drawingTime = ((_b = room === null || room === void 0 ? void 0 : room.configuration) === null || _b === void 0 ? void 0 : _b.roundTime) || 90;
            gameState.timeRemaining = drawingTime;
            // Guardar información del tiempo máximo de la fase
            const maxTime = drawingTime;
            gameState._currentPhaseMaxTime = maxTime;
            // Iniciar temporizador para la fase de dibujo
            this.startPhaseTimer(roomId, drawingTime);
            // Enviar la palabra completa solo al dibujante (información privada)
            (_c = socket_service_1.default.getIO()) === null || _c === void 0 ? void 0 : _c.to(userId).emit('game:wordToDrawConfirmed', {
                word: selectedWord,
                timeRemaining: drawingTime,
                maxTime,
            });
            // Generar versión ofuscada de la palabra para los demás jugadores (guiones bajos)
            const wordLength = selectedWord.length;
            const hiddenWord = '_ '.repeat(wordLength).trim();
            // Enviar notificación a todos sobre la longitud/formato de la palabra
            socket_service_1.default.sendSystemMessage(roomId, `¡Palabra seleccionada! Tiene ${wordLength} letras: ${hiddenWord}`);
            // Notificar a todos que se inicia fase de dibujo
            socket_service_1.default.sendSystemMessage(roomId, `${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`);
        });
    }
    // Manejar timeout en selección de palabra
    handleWordSelectionTimeout(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { roomId, gameState } = context;
            // Si no se seleccionó palabra, elegir una aleatoria
            if (!gameState.currentWord && ((_a = gameState.wordOptions) === null || _a === void 0 ? void 0 : _a.length)) {
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
            const room = yield models_1.GameRoomModel.findById(roomId);
            const drawingTime = ((_b = room === null || room === void 0 ? void 0 : room.configuration) === null || _b === void 0 ? void 0 : _b.roundTime) || 90;
            gameState.timeRemaining = drawingTime;
            // Guardar información del tiempo máximo de la fase
            const maxTime = drawingTime;
            gameState._currentPhaseMaxTime = maxTime;
            // Iniciar temporizador para la fase de dibujo
            this.startPhaseTimer(roomId, drawingTime);
            // Notificar que se eligió palabra automáticamente
            if (gameState.currentDrawerId) {
                // Enviar la palabra completa solo al dibujante (información privada)
                (_c = socket_service_1.default.getIO()) === null || _c === void 0 ? void 0 : _c.to(gameState.currentDrawerId.toString()).emit('game:wordToDrawConfirmed', {
                    word: gameState.currentWord,
                    timeRemaining: drawingTime,
                    maxTime,
                    autoSelected: true,
                });
                socket_service_1.default.sendUserNotification(gameState.currentDrawerId.toString(), 'warning', `Se eligió automáticamente la palabra: ${gameState.currentWord}`);
            }
            // Generar versión ofuscada de la palabra para mostrar a todos
            const wordLength = gameState.currentWord.length;
            const hiddenWord = '_ '.repeat(wordLength).trim();
            // Enviar notificación a todos sobre la longitud/formato de la palabra
            socket_service_1.default.sendSystemMessage(roomId, `¡Palabra seleccionada automáticamente! Tiene ${wordLength} letras: ${hiddenWord}`);
            socket_service_1.default.sendSystemMessage(roomId, `Tiempo de selección agotado. ${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`);
        });
    }
    // Manejar envío de dibujo
    handleSubmitDrawing(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                userId: new mongoose_1.Types.ObjectId(userId),
                imageData: payload.imageData,
                word: gameState.currentWord || 'desconocido',
                round: gameState.currentRound,
            });
            // Configurar tiempo para adivinar (60 segundos por defecto)
            gameState.timeRemaining = 60;
            // Notificar a todos que comienza fase de adivinanza
            socket_service_1.default.sendSystemMessage(roomId, `¡El dibujo está listo! Tienen ${gameState.timeRemaining} segundos para adivinar.`);
            // Enviar dibujo a todos los jugadores
            (_a = socket_service_1.default
                .getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:drawingSubmitted', {
                drawingId: gameState.drawings.length - 1,
                imageData: payload.imageData,
                drawerId: userId,
                timeRemaining: gameState.timeRemaining,
            });
        });
    }
    // Manejar timeout en dibujo
    handleDrawingTimeout(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, gameState } = context;
            // Si no hay dibujo, crear uno vacío
            if (!gameState.drawings) {
                gameState.drawings = [];
            }
            if (gameState.currentDrawerId) {
                gameState.drawings.push({
                    userId: gameState.currentDrawerId,
                    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // 1x1 pixel transparente
                    word: gameState.currentWord || 'desconocido',
                    round: gameState.currentRound,
                });
            }
            // Configurar tiempo para adivinar (60 segundos por defecto)
            gameState.timeRemaining = 60;
            // Notificar que el tiempo se agotó
            socket_service_1.default.sendSystemMessage(roomId, `¡Tiempo de dibujo agotado! Pasamos directamente a la fase de adivinanza.`);
            // Notificar al dibujante
            if (gameState.currentDrawerId) {
                socket_service_1.default.sendUserNotification(gameState.currentDrawerId.toString(), 'warning', 'Se agotó el tiempo para dibujar.');
            }
        });
    }
    // Manejar envío de adivinanza
    handleSubmitGuess(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                    userId: new mongoose_1.Types.ObjectId(userId),
                    drawingId: new mongoose_1.Types.ObjectId(), // ID temporal
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
                socket_service_1.default.sendSystemMessage(roomId, `¡${payload.username || 'Alguien'} ha adivinado correctamente!`);
                // Enviar a todos los nuevos puntajes
                (_a = socket_service_1.default
                    .getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:scoreUpdated', {
                    scores: Object.fromEntries(gameState.scores),
                });
                // Si alguien adivinó, pasar a la siguiente fase
                yield this.processEvent(roomId, models_1.GameEvent.TIMER_END);
            }
            else {
                // Enviar mensaje solo al jugador
                socket_service_1.default.sendUserNotification(userId, isCorrect ? 'success' : 'error', isCorrect ? '¡Correcto! +' + score + ' puntos' : 'Incorrecto, sigue intentando');
            }
        });
    }
    // Verificar si una adivinanza es correcta
    checkGuessCorrectness(guess, word) {
        // Implementación simple:
        // - Convertir ambas a minúsculas
        // - Eliminar acentos
        // - Comparar normalizado
        const normalizeText = (text) => {
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
    handleGuessingTimeout(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, gameState } = context;
            // Enviar mensaje de tiempo agotado
            socket_service_1.default.sendSystemMessage(roomId, `¡Tiempo de adivinanza agotado! La palabra era: ${gameState.currentWord}`);
            // Configurar tiempo para mostrar resultados de ronda
            gameState.timeRemaining = 10; // 10 segundos para ver resultados
        });
    }
    // Manejar siguiente ronda
    handleNextRound(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { roomId, gameState } = context;
            // Incrementar contador de ronda
            gameState.currentRound++;
            // Si alcanzamos el máximo de rondas, terminar juego
            if (gameState.currentRound > gameState.totalRounds) {
                yield this.processEvent(roomId, models_1.GameEvent.END_GAME);
                return;
            }
            // Limpiar datos de ronda anterior
            gameState.currentWord = undefined;
            gameState.wordOptions = undefined;
            // No reseteamos currentDrawerId para mantener la rotación
            // Enviar mensaje de nueva ronda
            socket_service_1.default.sendSystemMessage(roomId, `Preparando ronda ${gameState.currentRound} de ${gameState.totalRounds}...`);
            // Configurar tiempo para transición a la siguiente ronda
            const transitionTime = 5; // 5 segundos de transición
            gameState.timeRemaining = transitionTime;
            // Guardar tiempo máximo como propiedad temporal
            gameState._currentPhaseMaxTime = transitionTime;
            // Notificar a todos de la transición
            (_a = socket_service_1.default.getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:stateUpdated', {
                currentState: gameState.currentState,
                currentRound: gameState.currentRound,
                totalRounds: gameState.totalRounds,
                timeRemaining: gameState.timeRemaining,
                currentPhaseMaxTime: transitionTime,
            });
            // Iniciar temporizador para transición a selección de palabra
            this.startPhaseTimer(roomId, gameState.timeRemaining, () => {
                this.processEvent(roomId, models_1.GameEvent.TIMER_END); // Esto llevará a WORD_SELECTION
            });
        });
    }
    // Manejar fin del juego
    handleEndGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { roomId, gameState } = context;
            const rankedPlayers = [];
            if (gameState.scores) {
                // Convertir map a array y ordenar por puntuación
                const scoresMap = gameState.scores;
                for (const [userId, score] of scoresMap.entries()) {
                    // Obtener nombre del jugador
                    const player = yield models_1.GamePlayerModel.findOne({
                        roomId: new mongoose_1.Types.ObjectId(roomId),
                        userId: new mongoose_1.Types.ObjectId(userId),
                    });
                    rankedPlayers.push({
                        userId,
                        username: (player === null || player === void 0 ? void 0 : player.username) || 'Jugador desconocido',
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
                socket_service_1.default.sendSystemMessage(roomId, `¡Juego terminado! Ganador: ${winner.username} con ${winner.score} puntos.`);
            }
            else {
                socket_service_1.default.sendSystemMessage(roomId, '¡Juego terminado!');
            }
            // Enviar evento de fin de juego con resultados
            (_a = socket_service_1.default
                .getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:gameEnded', {
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
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: models_1.GameRoomStatus.FINISHED,
            });
            // Establecer tiempo para mostrar resultados
            const resultsTime = 30; // 30 segundos para ver resultados finales
            gameState.timeRemaining = resultsTime;
            // Guardar tiempo máximo como propiedad temporal
            gameState._currentPhaseMaxTime = resultsTime;
            // Iniciar temporizador para la fase de resultados
            this.startPhaseTimer(roomId, gameState.timeRemaining);
        });
    }
    // Manejar pausa del juego
    handlePauseGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId } = context;
            // Notificar pausa
            socket_service_1.default.sendSystemMessage(roomId, 'El juego ha sido pausado.');
        });
    }
    // Manejar reanudación del juego
    handleResumeGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, gameState } = context;
            // Notificar reanudación
            socket_service_1.default.sendSystemMessage(roomId, `El juego ha sido reanudado. Continuando desde ${gameState.currentState}...`);
        });
    }
    // Manejar error en el juego
    handleError(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, payload } = context;
            const errorMessage = (payload === null || payload === void 0 ? void 0 : payload.message) || 'Ha ocurrido un error en el juego.';
            // Notificar error
            socket_service_1.default.sendSystemMessage(roomId, `ERROR: ${errorMessage}`);
        });
    }
    // Manejar reinicio del juego
    handleResetGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId } = context;
            // Eliminar estado actual
            yield models_1.GameStateModel.findOneAndDelete({ roomId: new mongoose_1.Types.ObjectId(roomId) });
            // Actualizar estado de la sala
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: models_1.GameRoomStatus.WAITING,
                currentRound: 0,
            });
            // Reiniciar estado de los jugadores
            yield models_1.GamePlayerModel.updateMany({ roomId: new mongoose_1.Types.ObjectId(roomId) }, { status: models_1.PlayerStatus.WAITING, score: 0 });
            // Notificar reinicio
            socket_service_1.default.sendSystemMessage(roomId, 'El juego ha sido reiniciado.');
        });
    }
    // NUEVOS MÉTODOS PARA GESTIÓN DE TEMPORIZADORES
    // ---------------------------------------------
    // Método principal para iniciar y gestionar temporizadores de fase
    startPhaseTimer(roomId, duration, callback) {
        // Detener cualquier temporizador existente para esta sala
        this.stopTimer(roomId);
        // Calcular timestamps para seguimiento del temporizador
        const startTime = Date.now();
        const endTime = startTime + duration * 1000;
        // Crear intervalo para actualizar cada segundo
        const timerId = setInterval(() => {
            var _a;
            // Obtener el timer actual
            const timer = this.roomTimers.get(roomId);
            // Si no hay timer o está pausado, salir
            if (!timer || timer.isPaused)
                return;
            // Calcular tiempo restante basado en timestamp actual
            const now = Date.now();
            const elapsedMs = now - startTime;
            const remainingSecs = Math.max(0, Math.ceil((duration * 1000 - elapsedMs) / 1000));
            // Actualizar tiempo restante en el objeto timer
            timer.remainingTime = remainingSecs;
            this.roomTimers.set(roomId, timer);
            // Emitir actualización de tiempo a todos los jugadores
            (_a = socket_service_1.default.getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:timeUpdate', {
                timeRemaining: remainingSecs,
                startTime: startTime,
                endTime: endTime,
            });
            // Si el tiempo llega a cero
            if (remainingSecs <= 0) {
                this.stopTimer(roomId);
                if (callback)
                    callback();
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
    updateGameStateTime(roomId, timeRemaining, currentPhaseMaxTime) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Si no se proporciona currentPhaseMaxTime, usar el valor de timeRemaining
                const maxTime = currentPhaseMaxTime || timeRemaining;
                yield models_1.GameStateModel.findOneAndUpdate({ roomId: new mongoose_1.Types.ObjectId(roomId) }, {
                    $set: {
                        timeRemaining,
                        currentPhaseMaxTime: maxTime,
                    },
                });
                // Notificar a los clientes sobre la actualización del tiempo
                (_a = socket_service_1.default.getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:stateUpdated', {
                    timeRemaining,
                    currentPhaseMaxTime: maxTime,
                });
            }
            catch (error) {
                console.error(`Error actualizando tiempo en estado del juego para sala ${roomId}:`, error);
            }
        });
    }
    // Pausar el temporizador de una sala
    pauseTimer(roomId) {
        const timer = this.roomTimers.get(roomId);
        if (!timer || timer.isPaused)
            return;
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
    resumeTimer(roomId) {
        const timer = this.roomTimers.get(roomId);
        if (!timer || !timer.isPaused || !timer.pausedAt)
            return;
        // Calcular el tiempo transcurrido durante la pausa
        const pauseDuration = (Date.now() - timer.pausedAt) / 1000;
        // Actualizar los timestamps
        timer.startTime = Date.now() - (timer.duration - timer.remainingTime) * 1000;
        timer.endTime = timer.startTime + timer.remainingTime * 1000;
        // Iniciar un nuevo intervalo
        const newTimerId = setInterval(() => {
            var _a;
            // Verificar si el timer sigue existiendo y no está pausado
            const currentTimer = this.roomTimers.get(roomId);
            if (!currentTimer || currentTimer.isPaused)
                return;
            // Calcular tiempo restante
            const now = Date.now();
            const remainingSecs = Math.max(0, Math.ceil((currentTimer.endTime - now) / 1000));
            // Actualizar tiempo restante
            currentTimer.remainingTime = remainingSecs;
            this.roomTimers.set(roomId, currentTimer);
            // Emitir actualización
            (_a = socket_service_1.default.getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:timeUpdate', {
                timeRemaining: remainingSecs,
                startTime: currentTimer.startTime,
                endTime: currentTimer.endTime,
            });
            // Si el tiempo llega a cero
            if (remainingSecs <= 0) {
                this.stopTimer(roomId);
                if (currentTimer.callback)
                    currentTimer.callback();
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
    stopTimer(roomId) {
        const timer = this.roomTimers.get(roomId);
        if (!timer)
            return;
        // Detener el intervalo
        clearInterval(timer.timerId);
        // Eliminar del mapa
        this.roomTimers.delete(roomId);
        console.log(`Timer detenido para sala ${roomId}`);
    }
    // Obtener información sobre el temporizador de una sala
    getTimerInfo(roomId) {
        const timer = this.roomTimers.get(roomId);
        if (!timer)
            return null;
        return {
            timeRemaining: timer.remainingTime,
            isPaused: timer.isPaused,
            totalDuration: timer.duration,
        };
    }
}
// Exportar instancia del servicio
exports.default = new GameStateMachineService();
