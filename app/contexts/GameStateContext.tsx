'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import useSocket, { SocketConnectionState } from '../hooks/useSocket';
import { useAuth } from '../auth/AuthContext';
import { useRouter } from 'next/navigation';

// Enumeraciones y tipos (deben coincidir con los del backend)
export enum GameState {
  WAITING = 'waiting',
  STARTING = 'starting',
  WORD_SELECTION = 'wordSelection',
  DRAWING = 'drawing',
  GUESSING = 'guessing',
  ROUND_END = 'roundEnd',
  GAME_END = 'gameEnd',
  PAUSED = 'paused',
  ERROR = 'error',
}

export enum GameEvent {
  START_GAME = 'startGame',
  SELECT_WORD = 'selectWord',
  START_DRAWING = 'startDrawing',
  SUBMIT_DRAWING = 'submitDrawing',
  SUBMIT_GUESS = 'submitGuess',
  TIMER_END = 'timerEnd',
  END_ROUND = 'endRound',
  NEXT_ROUND = 'nextRound',
  END_GAME = 'endGame',
  PAUSE_GAME = 'pauseGame',
  RESUME_GAME = 'resumeGame',
  ERROR_OCCURRED = 'errorOccurred',
  RESET_GAME = 'resetGame',
}

// Interfaces para representar el estado del juego
export interface Drawing {
  userId: string;
  imageData: string;
  round: number;
}

export interface Guess {
  userId: string;
  guess: string;
  correct: boolean;
  score: number;
  round: number;
}

export interface Player {
  id: string;
  username: string;
  avatarColor: string;
  isHost?: boolean;
  isReady?: boolean;
}

// Estado del juego
export interface GameStateData {
  roomId: string;
  currentState: GameState;
  previousState?: GameState;
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  currentPhaseMaxTime?: number;
  currentDrawerId?: string;
  currentWord?: string;
  wordOptions?: string[];
  players: Player[];
  scores: Record<string, number>;
  drawings: Drawing[];
  guesses: Guess[];
  currentRoundIaEvaluation?: {
    isCorrect: boolean;
    justification: string;
    error?: string;
  };
  startedAt?: Date;
  lastUpdated: Date;
  error?: {
    message: string;
    code: string;
  };
  toastNotification?: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
  } | null;
  currentPlayerIndex: number;
}

// Acciones para el reducer
type GameStateAction =
  | { type: 'SET_STATE'; payload: Partial<GameStateData> }
  | { type: 'RESET_STATE' }
  | { type: 'START_GAME' }
  | { type: 'SELECT_WORD'; word: string }
  | { type: 'SUBMIT_DRAWING'; imageData: string }
  | { type: 'SUBMIT_GUESS'; guess: string }
  | { type: 'SET_ERROR'; error: { message: string; code: string } }
  | { type: 'UPDATE_TIME_REMAINING'; timeRemaining: number }
  | { type: 'SHOW_TOAST'; payload: GameStateData['toastNotification'] }
  | { type: 'HIDE_TOAST' };

// Estado inicial
const initialState: GameStateData = {
  roomId: '',
  currentState: GameState.WAITING,
  currentRound: 0,
  totalRounds: 3,
  timeRemaining: 0,
  currentPhaseMaxTime: 0,
  players: [],
  scores: {},
  drawings: [],
  guesses: [],
  currentRoundIaEvaluation: undefined,
  toastNotification: null,
  lastUpdated: new Date(),
  currentPlayerIndex: 0,
  wordOptions: [],
};

// Reducer para manejar las acciones
function gameStateReducer(state: GameStateData, action: GameStateAction): GameStateData {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'RESET_STATE':
      return { ...initialState, roomId: state.roomId, toastNotification: null };
    case 'SET_ERROR':
      return { 
        ...state, 
        currentState: GameState.ERROR, 
        error: action.error,
        toastNotification: { id: Date.now().toString(), type: 'error', message: action.error.message, duration: 5000 }
      };
    case 'UPDATE_TIME_REMAINING':
      return { ...state, timeRemaining: action.timeRemaining };
    case 'SHOW_TOAST':
      return { ...state, toastNotification: action.payload };
    case 'HIDE_TOAST':
      return { ...state, toastNotification: null };
    default:
      return state;
  }
}

// Interfaces para el contexto
interface GameStateContextType {
  state: GameStateData;
  dispatch: React.Dispatch<GameStateAction>;
  isLoading: boolean;
  triggerEvent: (event: GameEvent, payload?: any) => void;
  selectWord: (word: string) => void;
  submitDrawing: (imageData: string) => Promise<any>;
  submitGuess: (guess: string) => void;
  showToast: (toast: NonNullable<GameStateData['toastNotification']>) => void;
  isHost: boolean;
  isCurrentDrawer: boolean;
}

// Crear el contexto
const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

// Props para el proveedor
interface GameStateProviderProps {
  roomId: string;
  children: React.ReactNode;
}

// Proveedor del contexto
export function GameStateProvider({ roomId, children }: GameStateProviderProps) {
  console.log('[GameStateProvider] Renderizando con roomId:', roomId);
  const [state, dispatch] = useReducer(gameStateReducer, { ...initialState, roomId });
  const [isLoading, setIsLoading] = useState(true);
  const { socket, connectionState, emit, on } = useSocket();
  const { user } = useAuth();
  const router = useRouter();

  const isHost = state.players.some(p => p.id === user?.userId && p.isHost);
  const isCurrentDrawer = state.currentDrawerId === user?.userId;

  const showToast = useCallback((toastConfig: NonNullable<GameStateData['toastNotification']>) => {
    const id = toastConfig.id || Date.now().toString();
    const duration = toastConfig.duration || 3000;
    dispatch({ type: 'SHOW_TOAST', payload: { ...toastConfig, id } });
    
    setTimeout(() => {
        // Solo ocultar si este toast (identificado por id) sigue siendo el activo
        // Esto es una simplificación. Un sistema real tendría una cola de toasts.
        // Aquí, si el id no coincide, significa que ya hay un toast más nuevo.
        // O podríamos usar el state actual para verificar.
        // dispatch((currentState) => {
        //   if (currentState.toastNotification?.id === id) {
        //     return { type: 'HIDE_TOAST' };
        //   }
        //   return currentState; // No hacer nada si el toast cambió
        // });
        // Simplificado por ahora:
         dispatch({ type: 'HIDE_TOAST' });
    }, duration);
  }, [dispatch]);

  useEffect(() => {
    // PRIMERO, ASEGURARSE DE QUE TENEMOS UN roomId VÁLIDO
    if (!roomId) { // Si roomId es undefined, null, o una cadena vacía
      console.log('[GameStateContext] useEffect: roomId no está definido aún. Saliendo.');
      setIsLoading(false); // Podríamos querer poner isLoading a false si no hay roomId
      return; 
    }

    if (!socket || connectionState !== SocketConnectionState.CONNECTED || !user) {
      console.log('[GameStateContext] useEffect: Socket no listo o usuario no autenticado. Saliendo.');
      if (isLoading) setIsLoading(false); // Si estábamos cargando y no hay socket, dejar de cargar.
      return;
    }
    
    console.log('[GameStateContext] useEffect: Socket listo y usuario autenticado. Estableciendo isLoading a true y emitiendo game:getState');
    setIsLoading(true);

    console.log('[GameStateContext] Emitiendo game:getState con roomId:', roomId);
    emit('game:getState', { roomId }, (error: any, data: any) => {
      console.log('[GameStateContext] game:getState CALLBACK EJECUTADO');
      if (error) {
        console.error('[GameStateContext] game:getState ERROR:', error);
        dispatch({ type: 'SET_ERROR', error: { message: error.message || JSON.stringify(error), code: 'GET_STATE_ERROR' } });
      } else if (data) {
        console.log('[GameStateContext] game:getState DATOS RECIBIDOS:', data);
        dispatch({ type: 'SET_STATE', payload: data });
      } else {
        console.warn('[GameStateContext] game:getState: No se recibieron datos ni errores. El estado inicial podría ser nulo.');
        // Opcionalmente, establecer un estado por defecto o manejarlo como un error si se espera siempre un estado.
        // Por ahora, permitimos que el estado se establezca como null o vacío si es lo que devuelve el servidor.
        dispatch({ type: 'SET_STATE', payload: initialState }); // Volver al estado inicial si no hay datos.
      }
      console.log('[GameStateContext] game:getState: Estableciendo isLoading a false.');
      setIsLoading(false);
    });

    const unsubState = on('game:stateUpdated', (data: Partial<GameStateData>) => {
      console.log('[GameStateContext] game:stateUpdated RECIBIDO:', data);
      dispatch({ type: 'SET_STATE', payload: data });
    });
    const unsubTimer = on('game:timeUpdate', (data: { timeRemaining: number }) => dispatch({ type: 'UPDATE_TIME_REMAINING', timeRemaining: data.timeRemaining }));
    const unsubError = on('game:error', (data: { message: string; code: string }) => dispatch({ type: 'SET_ERROR', error: data }));
    const unsubNotification = on('user:notification', (data: any) => {
        showToast({
            id: Date.now().toString(),
            type: data.type || 'info',
            message: data.message,
            duration: data.duration || 5000 // Duración un poco más larga para notificaciones del servidor
        });
    });
    
    // Agregar manejador específico para cuando el juego comienza
    const unsubGameStarted = on('room:gameStarted', (data: any) => {
        console.log('[GameStateContext] room:gameStarted RECIBIDO:', data);
        // Actualizar el estado para comenzar el juego
        dispatch({ 
            type: 'SET_STATE', 
            payload: { 
                currentState: GameState.STARTING,
                previousState: GameState.WAITING,
                startedAt: new Date()
            }
        });
        
        // Mostrar toast de inicio de juego
        showToast({
            id: Date.now().toString(),
            type: 'success',
            message: '¡El juego ha comenzado!',
            duration: 3000
        });
    });
    
    return () => { 
        unsubState(); 
        unsubTimer(); 
        unsubError(); 
        unsubNotification();
        unsubGameStarted(); // Limpiar este manejador también
    };
  }, [socket, connectionState, user, roomId, emit, on, showToast]);

  const triggerEvent = useCallback((event: GameEvent, payload?: any) => {
    if (!socket || connectionState !== SocketConnectionState.CONNECTED) {
      showToast({id: Date.now().toString(), type:'error', message: 'Socket no disponible para enviar evento.', duration: 3000});
      console.error('Socket no disponible');
      return;
    }
    emit('game:event', { roomId, event, payload });
  }, [socket, connectionState, emit, roomId, showToast]);
  
  const selectWord = useCallback((word: string) => {
    triggerEvent(GameEvent.SELECT_WORD, { word });
    showToast({id: Date.now().toString(), type: 'info', message: `Palabra "${word}" seleccionada.`, duration: 2000});
  }, [triggerEvent, showToast]);

  const submitDrawing = useCallback(async (imageData: string) => {
    if (!socket || connectionState !== SocketConnectionState.CONNECTED) {
      const errMsg = 'No hay conexión disponible para enviar el dibujo.';
      showToast({id: Date.now().toString(), type: 'error', message: errMsg, duration: 5000});
      throw new Error(errMsg);
    }
    try {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          const errMsg = 'Tiempo de espera agotado al enviar el dibujo';
          showToast({id: Date.now().toString(), type: 'error', message: errMsg, duration: 5000});
          reject(new Error(errMsg));
        }, 15000);
        emit('game:event', { roomId, event: GameEvent.SUBMIT_DRAWING, payload: { imageData } }, (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            const errorMsg = typeof error === 'string' ? error : (error.message || 'Error al enviar dibujo por socket.');
            showToast({id: Date.now().toString(), type: 'error', message: errorMsg, duration: 5000});
            reject(error);
          } else {
            showToast({id: Date.now().toString(), type: 'success', message: '¡Dibujo enviado con éxito!', duration: 3000});
            resolve(response);
          }
        });
      });
    } catch (error: any) {
      const errorMsg = typeof error === 'string' ? error : (error.message || 'Error desconocido al procesar envío de dibujo.');
      showToast({id: Date.now().toString(), type: 'error', message: errorMsg, duration: 5000});
      try {
        const response = await fetch(`/api/rooms/${roomId}/drawings`, { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}`}, body: JSON.stringify({ imageData })});
        if (!response.ok) {
            const fallbackErrorData = await response.json().catch(() => ({message: "Error en fallback API REST"}));
            throw new Error(fallbackErrorData.message);
        }
        showToast({id: Date.now().toString(), type: 'success', message: 'Dibujo enviado (fallback API)!', duration: 3000});
        return await response.json();
      } catch (fallbackError: any) {
        const fallbackErrorMsg = typeof fallbackError === 'string' ? fallbackError : (fallbackError.message || 'Error desconocido en fallback API.');
        showToast({id: Date.now().toString(), type: 'error', message: fallbackErrorMsg, duration: 5000});
        throw error; 
      }
    }
  }, [socket, connectionState, emit, roomId, showToast]);

  const submitGuess = useCallback((guess: string) => {
    triggerEvent(GameEvent.SUBMIT_GUESS, { guess });
    // El feedback de adivinanza enviada es local en GuessingScreen.
    // El resultado (correcto/incorrecto) vendrá por `user:notification` o `game:stateUpdated`.
  }, [triggerEvent]);

  const value = {
    state,
    dispatch,
    isLoading,
    triggerEvent,
    selectWord,
    submitDrawing,
    submitGuess,
    showToast,
    isHost,
    isCurrentDrawer,
  };

  // Componente Toast simple
  const Toast = () => {
    if (!state.toastNotification) return null;
    const { type, message } = state.toastNotification;
    let bgColor = 'bg-blue-500';
    if (type === 'success') bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    if (type === 'warning') bgColor = 'bg-yellow-500';

    // Aplicar estilos para transición de opacidad y transform en lugar de depender de una clase CSS externa
    return (
      <div 
        className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm ${bgColor}`}
        style={{
          zIndex: 1000,
          transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          opacity: state.toastNotification ? 1 : 0,
          transform: state.toastNotification ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {message}
      </div>
    );
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
      <Toast />
    </GameStateContext.Provider>
  );
}

// Hook para usar el contexto
export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState debe ser usado dentro de un GameStateProvider');
  }
  return context;
} 