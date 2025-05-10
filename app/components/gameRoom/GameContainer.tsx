'use client';

import React, { useRef } from 'react';
import { useGameState, GameState } from '../../contexts/GameStateContext';
import { SwitchTransition, CSSTransition } from 'react-transition-group';
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
  const { state, dispatch, isLoading } = useGameState();
  const nodeRef = useRef(null); // Referencia para CSSTransition

  // Si está cargando, mostrar pantalla de carga
  if (isLoading) {
    return <LoadingScreen message="Cargando juego..." />;
  }

  const renderGameState = () => {
    // Renderizar componente según el estado actual del juego
    switch (state.currentState) {
      case GameState.WAITING:
        return (
          <WaitingRoom
            roomId={roomId}
            roomName={roomName}
            isPrivate={isPrivate}
            accessCode={accessCode}
            onGameStart={() => {
              // Actualizar el estado manualmente cuando el WaitingRoom recibe room:gameStarted
              console.log('Sala de espera informa inicio de juego - transitando a STARTING');
              
              // Actualizar el estado directamente usando dispatch
              dispatch({ 
                type: 'SET_STATE', 
                payload: { 
                  currentState: GameState.STARTING,
                  previousState: GameState.WAITING
                }
              });
            }}
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
  };

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        nodeRef={nodeRef} // Usar la referencia en lugar de findDOMNode
        key={state.currentState} // Clave para que SwitchTransition detecte el cambio
        timeout={300} // Duración de la animación en ms (debe coincidir con CSS)
        classNames="fade" // Prefijo para las clases CSS (ej. fade-enter, fade-exit)
        unmountOnExit
        appear // Aplicar transición en el montaje inicial si es necesario
      >
        <div ref={nodeRef} className="w-full min-h-[400px]">{/* Contenedor para aplicar la animación y asegurar altura mínima */}
          {renderGameState()}
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
} 