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
                    // Limpiar el estado anterior
                    gameState.previousState = undefined;
                }
                // Actualizar el estado
                gameState.currentState = targetState;
                gameState.lastUpdated = new Date();
                // Guardar el estado actualizado
                yield models_1.GameStateModel.findByIdAndUpdate(gameState._id, gameState);
                // Notificar cambio de estado a todos los usuarios
                yield this.notifyStateChange(roomId, gameState);
                return gameState;
            }
            catch (error) {
                console.error(`Error procesando evento ${event} en sala ${roomId}:`, error);
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
                return gameState;
            }
            catch (error) {
                console.error(`Error obteniendo estado del juego para sala ${roomId}:`, error);
                throw error;
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
                // Enviar notificación de cambio de estado mediante socket.io
                (_a = socket_service_1.default
                    .getIO()) === null || _a === void 0 ? void 0 : _a.to(roomId).emit('game:stateChanged', {
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
            // Actualizar estado de la sala
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: models_1.GameRoomStatus.PLAYING,
            });
            // Inicializar datos de juego
            gameState.currentRound = 1;
            gameState.startedAt = new Date();
            gameState.timeRemaining = 5; // 5 segundos de cuenta regresiva
            // Inicializar puntuaciones para todos los jugadores
            const players = yield models_1.GamePlayerModel.find({ roomId: new mongoose_1.Types.ObjectId(roomId) });
            const scores = new Map();
            for (const player of players) {
                scores.set(player.userId.toString(), 0);
                // Actualizar estado de jugadores
                yield models_1.GamePlayerModel.findByIdAndUpdate(player._id, {
                    status: models_1.PlayerStatus.PLAYING,
                    score: 0,
                });
            }
            gameState.scores = scores;
            // Enviar mensaje de sistema
            socket_service_1.default.sendSystemChatMessage(roomId, '¡El juego ha comenzado! Preparando primera ronda...');
        });
    }
    // Iniciar selección de palabra
    handleStartWordSelection(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { roomId, gameState } = context;
            // Determinar quién dibuja en esta ronda
            const players = yield models_1.GamePlayerModel.find({
                roomId: new mongoose_1.Types.ObjectId(roomId),
                status: models_1.PlayerStatus.PLAYING,
            });
            if (players.length < 2) {
                throw new Error('Se necesitan al menos 2 jugadores para iniciar la ronda');
            }
            // Obtener sala para conocer configuración
            const room = yield models_1.GameRoomModel.findById(roomId);
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
            const usedIndices = new Set();
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
            (_a = socket_service_1.default.getIO()) === null || _a === void 0 ? void 0 : _a.to(currentDrawer.userId.toString()).emit('game:wordSelection', {
                options: wordOptions,
                timeRemaining: gameState.timeRemaining,
            });
            // Notificar a todos quién dibujará
            socket_service_1.default.sendSystemChatMessage(roomId, `¡Ronda ${gameState.currentRound}! ${currentDrawer.username} va a dibujar. Esperando selección de palabra...`);
        });
    }
    // Manejar palabra seleccionada
    handleWordSelected(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
            // Configurar tiempo de dibujo (90 segundos por defecto)
            const room = yield models_1.GameRoomModel.findById(roomId);
            gameState.timeRemaining = (room === null || room === void 0 ? void 0 : room.configuration.roundTime) || 90;
            // Notificar a todos que se inicia fase de dibujo
            socket_service_1.default.sendSystemChatMessage(roomId, `${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`);
        });
    }
    // Manejar timeout en selección de palabra
    handleWordSelectionTimeout(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
            // Configurar tiempo de dibujo (90 segundos por defecto)
            const room = yield models_1.GameRoomModel.findById(roomId);
            gameState.timeRemaining = (room === null || room === void 0 ? void 0 : room.configuration.roundTime) || 90;
            // Notificar que se eligió palabra automáticamente
            if (gameState.currentDrawerId) {
                socket_service_1.default.sendUserNotification(gameState.currentDrawerId.toString(), 'warning', `Se eligió automáticamente la palabra: ${gameState.currentWord}`);
            }
            socket_service_1.default.sendSystemChatMessage(roomId, `Tiempo de selección agotado. ${gameState.timeRemaining} segundos para dibujar. ¡Prepárense para adivinar!`);
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
            socket_service_1.default.sendSystemChatMessage(roomId, `¡El dibujo está listo! Tienen ${gameState.timeRemaining} segundos para adivinar.`);
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
            socket_service_1.default.sendSystemChatMessage(roomId, `¡Tiempo de dibujo agotado! Pasamos directamente a la fase de adivinanza.`);
            // Notificar al dibujante
            if (gameState.currentDrawerId) {
                socket_service_1.default.sendUserNotification(gameState.currentDrawerId.toString(), 'warning', 'Se agotó el tiempo para dibujar.');
            }
        });
    }
    // Manejar envío de adivinanza
    handleSubmitGuess(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { roomId, gameState, payload, userId } = context;
            if (!userId) {
                throw new Error('Usuario no identificado');
            }
            // Verificar que no es el dibujante
            if (userId === ((_a = gameState.currentDrawerId) === null || _a === void 0 ? void 0 : _a.toString())) {
                throw new Error('El dibujante no puede adivinar');
            }
            // Verificar si ya existe una adivinanza de este usuario para esta ronda
            const existingGuess = (_b = gameState.guesses) === null || _b === void 0 ? void 0 : _b.find((g) => g.userId.toString() === userId && g.drawingId.toString() === payload.drawingId);
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
                userId: new mongoose_1.Types.ObjectId(userId),
                drawingId: new mongoose_1.Types.ObjectId(payload.drawingId),
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
                socket_service_1.default.sendSystemChatMessage(roomId, `¡${payload.username || 'Alguien'} ha adivinado correctamente!`);
                // Enviar a todos los nuevos puntajes
                (_c = socket_service_1.default
                    .getIO()) === null || _c === void 0 ? void 0 : _c.to(roomId).emit('game:scoreUpdated', {
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
            socket_service_1.default.sendSystemChatMessage(roomId, `¡Tiempo de adivinanza agotado! La palabra era: ${gameState.currentWord}`);
            // Configurar tiempo para mostrar resultados de ronda
            gameState.timeRemaining = 10; // 10 segundos para ver resultados
        });
    }
    // Manejar siguiente ronda
    handleNextRound(context) {
        return __awaiter(this, void 0, void 0, function* () {
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
            // Enviar mensaje de nueva ronda
            socket_service_1.default.sendSystemChatMessage(roomId, `Preparando ronda ${gameState.currentRound} de ${gameState.totalRounds}...`);
        });
    }
    // Manejar fin del juego
    handleEndGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { roomId, gameState } = context;
            // Calcular ganador
            let winnerId;
            let highestScore = -1;
            (_a = gameState.scores) === null || _a === void 0 ? void 0 : _a.forEach((score, userId) => {
                if (score > highestScore) {
                    highestScore = score;
                    winnerId = userId;
                }
            });
            // Obtener nombre del ganador
            let winnerName = 'Desconocido';
            if (winnerId) {
                const winner = yield models_1.GamePlayerModel.findOne({
                    roomId: new mongoose_1.Types.ObjectId(roomId),
                    userId: new mongoose_1.Types.ObjectId(winnerId),
                });
                winnerName = (winner === null || winner === void 0 ? void 0 : winner.username) || winnerName;
            }
            // Notificar resultados finales
            socket_service_1.default.sendSystemChatMessage(roomId, `¡Juego terminado! Ganador: ${winnerName} con ${highestScore} puntos.`);
            // Enviar evento de fin de juego con resultados
            (_b = socket_service_1.default
                .getIO()) === null || _b === void 0 ? void 0 : _b.to(roomId).emit('game:gameEnded', {
                winner: {
                    id: winnerId,
                    name: winnerName,
                    score: highestScore,
                },
                scores: Object.fromEntries(gameState.scores || new Map()),
            });
            // Actualizar estado de la sala
            yield models_1.GameRoomModel.findByIdAndUpdate(roomId, {
                status: models_1.GameRoomStatus.FINISHED,
            });
            // Establecer tiempo para mostrar resultados
            gameState.timeRemaining = 30; // 30 segundos para ver resultados finales
        });
    }
    // Manejar pausa del juego
    handlePauseGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId } = context;
            // Notificar pausa
            socket_service_1.default.sendSystemChatMessage(roomId, 'El juego ha sido pausado.');
        });
    }
    // Manejar reanudación del juego
    handleResumeGame(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, gameState } = context;
            // Notificar reanudación
            socket_service_1.default.sendSystemChatMessage(roomId, `El juego ha sido reanudado. Continuando desde ${gameState.currentState}...`);
        });
    }
    // Manejar error en el juego
    handleError(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, payload } = context;
            const errorMessage = (payload === null || payload === void 0 ? void 0 : payload.message) || 'Ha ocurrido un error en el juego.';
            // Notificar error
            socket_service_1.default.sendSystemChatMessage(roomId, `ERROR: ${errorMessage}`);
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
            socket_service_1.default.sendSystemChatMessage(roomId, 'El juego ha sido reiniciado.');
        });
    }
}
// Exportar instancia del servicio
exports.default = new GameStateMachineService();
