'use client';

import React from 'react';
import { useGameState, GameState } from '../../contexts/GameStateContext';
import WaitingRoom from './WaitingRoom';
import LoadingScreen from './game-states/LoadingScreen';
import StartingGame from './game-states/StartingGame';
import WordSelection from './game-states/WordSelection';
import DrawingScreen from './game-states/DrawingScreen';
import GuessingScreen from './game-states/GuessingScreen';
import RoundEndScreen from './game-states/RoundEndScreen';
import GameEndScreen from './game-states/GameEndScreen';
import ErrorScreen from './game-states/ErrorScreen';

interface GameContainerProps {
  roomId: string;
  roomName: string;
  isPrivate: boolean;
  accessCode?: string;
  onLeaveRoom: () => void;
}

export default function GameContainer({
  roomId,
  roomName,
  isPrivate,
  accessCode,
  onLeaveRoom,
}: GameContainerProps) {
  const { state, isLoading } = useGameState();

  // Si está cargando, mostrar pantalla de carga
  if (isLoading) {
    return <LoadingScreen message="Cargando juego..." />;
  }

  // Renderizar componente según el estado actual del juego
  switch (state.currentState) {
    case GameState.WAITING:
      return (
        <WaitingRoom
          roomId={roomId}
          roomName={roomName}
          isPrivate={isPrivate}
          accessCode={accessCode}
          onGameStart={() => {}} // Manejado por el contexto
          onLeaveRoom={onLeaveRoom}
        />
      );

    case GameState.STARTING:
      return <StartingGame />;

    case GameState.WORD_SELECTION:
      return <WordSelection />;

    case GameState.DRAWING:
      return <DrawingScreen />;

    case GameState.GUESSING:
      return <GuessingScreen />;

    case GameState.ROUND_END:
      return <RoundEndScreen />;

    case GameState.GAME_END:
      return <GameEndScreen onLeaveRoom={onLeaveRoom} />;

    case GameState.ERROR:
      return <ErrorScreen error={state.error} onLeaveRoom={onLeaveRoom} />;

    case GameState.PAUSED:
      // Si está pausado, mostrar el componente según el estado anterior
      switch (state.previousState) {
        case GameState.DRAWING:
          return <DrawingScreen isPaused={true} />;
        case GameState.GUESSING:
          return <GuessingScreen isPaused={true} />;
        default:
          return <LoadingScreen message="Juego pausado..." />;
      }

    default:
      return <ErrorScreen error={{ message: 'Estado desconocido', code: 'UNKNOWN_STATE' }} onLeaveRoom={onLeaveRoom} />;
  }
} 