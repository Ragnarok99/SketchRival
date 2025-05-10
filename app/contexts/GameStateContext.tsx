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
  const [state, dispatch] = useReducer(gameStateReducer, { ...initialState, roomId });
  const [isLoading, setIsLoading] = useState(true);
  const { socket, connectionState, emit, on } = useSocket();
  const { user } = useAuth();
  const router = useRouter();

  // Determinar si el usuario actual es el anfitrión
  const isHost = state.players.some(
    (player) => player.id === user?.userId && player.isHost
  );

  // Determinar si el usuario actual es el dibujante
  const isCurrentDrawer = state.currentDrawerId === user?.userId;

  // Cargar estado inicial y configurar listeners
  useEffect(() => {
    if (!socket || connectionState !== SocketConnectionState.CONNECTED || !user) {
      return;
    }

    setIsLoading(true);

    // Solicitar estado inicial
    emit('game:getState', { roomId }, (error: any, data: any) => {
      if (error) {
        dispatch({
          type: 'SET_ERROR',
          error: { message: error, code: 'GET_STATE_ERROR' },
        });
      } else if (data) {
        dispatch({ type: 'SET_STATE', payload: data });
      }
      setIsLoading(false);
    });

    // Escuchar actualizaciones de estado
    const unsubscribe = on('game:stateUpdated', (data: Partial<GameStateData>) => {
      dispatch({ type: 'SET_STATE', payload: data });
    });

    // Escuchar actualizaciones de tiempo
    const unsubscribeTimer = on('game:timeUpdate', (data: { timeRemaining: number }) => {
      dispatch({ type: 'UPDATE_TIME_REMAINING', timeRemaining: data.timeRemaining });
    });

    // Escuchar errores
    const unsubscribeError = on('game:error', (data: { message: string; code: string }) => {
      dispatch({ type: 'SET_ERROR', error: data });
    });

    // Escuchar notificaciones genéricas del sistema/juego desde el servidor
    const unsubscribeNotification = on('user:notification', (data: any) => {
        dispatch({ type: 'SHOW_TOAST', payload: {
            id: Date.now().toString(),
            type: data.type || 'info',
            message: data.message,
            duration: data.duration || 3000
        } });
    });

    // Limpiar listeners al desmontar
    return () => {
      unsubscribe();
      unsubscribeTimer();
      unsubscribeError();
      unsubscribeNotification();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connectionState, user, roomId, emit, on]);

  // Función para enviar eventos al backend
  const triggerEvent = (event: GameEvent, payload?: any) => {
    if (!socket || connectionState !== SocketConnectionState.CONNECTED) {
      console.error('Socket no disponible');
      return;
    }

    emit('game:event', {
      roomId,
      event,
      payload,
    });
  };

  // Funciones específicas para acciones comunes
  const selectWord = (word: string) => {
    triggerEvent(GameEvent.SELECT_WORD, { word });
  };

  const showToast = useCallback((toastConfig: NonNullable<GameStateData['toastNotification']>) => {
    dispatch({ type: 'SHOW_TOAST', payload: toastConfig });
    if (toastConfig.duration) {
      setTimeout(() => {
        // Solo ocultar si este toast sigue siendo el activo
        // Esto evita que un timeout antiguo oculte un toast nuevo
        // Para un sistema más robusto, se necesitaría comparar IDs o tener una cola de toasts
        dispatch({ type: 'HIDE_TOAST' }); 
      }, toastConfig.duration);
    }
  }, [dispatch]);

  const originalSubmitDrawing = async (imageData: string) => {
    if (!socket || connectionState !== SocketConnectionState.CONNECTED) {
        const errMsg = 'No hay conexión disponible para enviar el dibujo.';
        showToast({id: Date.now().toString(), type: 'error', message: errMsg, duration: 5000});
        throw new Error(errMsg);
    }
    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const errMsg = 'Tiempo de espera agotado al enviar el dibujo';
          showToast({id: Date.now().toString(), type: 'error', message: errMsg, duration: 5000});
          reject(new Error(errMsg));
        }, 15000);
        emit('game:event', { roomId, event: GameEvent.SUBMIT_DRAWING, payload: { imageData } }, (error: any, response: any) => {
          clearTimeout(timeout);
          if (error) {
            showToast({id: Date.now().toString(), type: 'error', message: `Error al enviar dibujo: ${error.message || error}`, duration: 5000});
            reject(error);
          } else {
            showToast({id: Date.now().toString(), type: 'success', message: '¡Dibujo enviado con éxito!', duration: 3000});
            resolve(response);
          }
        });
      });
    } catch (error: any) {
      showToast({id: Date.now().toString(), type: 'error', message: `Error (catch principal): ${error.message || error}`, duration: 5000});
      try {
        const response = await fetch(`/api/game-rooms/${roomId}/drawings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ imageData })});
        if (!response.ok) throw new Error('Error en fallback API REST');
        showToast({id: Date.now().toString(), type: 'success', message: 'Dibujo enviado (fallback API)!', duration: 3000});
        return await response.json();
      } catch (fallbackError: any) {
        showToast({id: Date.now().toString(), type: 'error', message: `Error (fallback): ${fallbackError.message || fallbackError}`, duration: 5000});
        throw error;
      }
    }
  };

  const originalSubmitGuess = (guess: string) => {
    triggerEvent(GameEvent.SUBMIT_GUESS, { guess });
    // Podríamos añadir un callback al triggerEvent o un evento específico para confirmar la adivinanza
    // y luego mostrar un toast. Por ahora, el feedback es local en GuessingScreen.
    // Opcional: showToast({id: Date.now().toString(), type: 'info', message: `Adivinanza "${guess}" enviada.`, duration: 2000});
  };

  // Valor del contexto
  const value = {
    state,
    dispatch,
    isLoading,
    triggerEvent,
    selectWord,
    submitDrawing: originalSubmitDrawing,
    submitGuess: originalSubmitGuess,
    showToast,
    isHost,
    isCurrentDrawer,
  };

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

// Hook para usar el contexto
export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState debe ser usado dentro de un GameStateProvider');
  }
  return context;
} 