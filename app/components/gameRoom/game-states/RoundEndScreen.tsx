'use client';

import React, { useEffect, useState } from 'react';
import { useGameState, GameEvent } from '../../../contexts/GameStateContext';

export default function RoundEndScreen() {
  const { state, triggerEvent, isHost } = useGameState();
  const [countdown, setCountdown] = useState(10);
  
  // Timer para pasar a la siguiente ronda automáticamente
  useEffect(() => {
    if (state.timeRemaining <= 0) return;
    
    setCountdown(Math.ceil(state.timeRemaining / 1000));
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.timeRemaining]);
  
  // Pasar a la siguiente ronda o finalizar juego
  const handleNextAction = () => {
    if (state.currentRound === state.totalRounds) {
      triggerEvent(GameEvent.END_GAME);
    } else {
      triggerEvent(GameEvent.NEXT_ROUND);
    }
  };
  
  // Encontrar el dibujo de la ronda actual
  const currentDrawing = state.drawings.find(
    drawing => drawing.round === state.currentRound && drawing.userId === state.currentDrawerId
  );
  
  // Calcular puntuaciones de la ronda
  const roundScores = [...state.players]
    .map(player => {
      // Encontrar puntos ganados en esta ronda
      const pointsEarned = state.guesses
        .filter(guess => 
          guess.userId === player.id && 
          guess.correct && 
          state.drawings.some(d => d.round === state.currentRound && d.userId === state.currentDrawerId)
        )
        .reduce((sum, guess) => sum + guess.score, 0);
      
      // Puntos por dibujar (si es el dibujante)
      const drawerPoints = player.id === state.currentDrawerId ? 
        state.guesses.filter(g => g.correct).length * 10 : 0;
      
      return {
        ...player,
        pointsEarned: pointsEarned + drawerPoints,
        totalScore: state.scores[player.id] || 0
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
  
  // Obtener adivinanzas correctas e incorrectas
  const correctGuesses = state.guesses
    .filter(guess => guess.correct && state.drawings.some(d => d.round === state.currentRound))
    .map(guess => {
      const player = state.players.find(p => p.id === guess.userId);
      return {
        ...guess,
        playerName: player?.username || 'Desconocido'
      };
    });
  
  const incorrectGuesses = state.guesses
    .filter(guess => !guess.correct && state.drawings.some(d => d.round === state.currentRound))
    .map(guess => {
      const player = state.players.find(p => p.id === guess.userId);
      return {
        ...guess,
        playerName: player?.username || 'Desconocido'
      };
    })
    .slice(0, 5); // Limitar a 5 incorrectas para no saturar la UI
  
  // Nombre del dibujante
  const drawerName = state.players.find(p => p.id === state.currentDrawerId)?.username || 'Desconocido';
  
  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Fin de la Ronda {state.currentRound}</h2>
      <p className="text-gray-600 mb-6">
        {state.currentRound === state.totalRounds 
          ? 'Última ronda completada'
          : `Siguiente ronda en ${countdown} segundos`
        }
      </p>
      
      {/* Dibujo y palabra */}
      <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-gray-600">Dibujado por: <span className="font-medium">{drawerName}</span></p>
          <p className="text-blue-600 font-medium">{state.currentWord}</p>
        </div>
        
        {currentDrawing && (
          <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden mb-2" style={{ height: '200px' }}>
            <img 
              src={currentDrawing.imageData} 
              alt={`Dibujo de ${state.currentWord}`} 
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {state.currentRoundIaEvaluation && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-700 font-semibold">Opinión de la IA:</p>
            <p className={`text-xs ${state.currentRoundIaEvaluation.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {state.currentRoundIaEvaluation.isCorrect ? 'Correcto' : 'Incorrecto'}: {" "}
              <span className="text-gray-600 italic">{state.currentRoundIaEvaluation.justification}</span>
            </p>
          </div>
        )}
      </div>
      
      {/* Resumen de adivinanzas */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-lg font-medium text-green-600 mb-2">Adivinanzas Correctas</h3>
          {correctGuesses.length > 0 ? (
            <ul className="space-y-1">
              {correctGuesses.map((guess, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span className="font-medium">{guess.playerName}</span>
                  <span className="ml-auto text-green-600">+{guess.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">Nadie adivinó correctamente</p>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-red-600 mb-2">Adivinanzas Incorrectas</h3>
          {incorrectGuesses.length > 0 ? (
            <ul className="space-y-1">
              {incorrectGuesses.map((guess, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  <span>{guess.playerName}: </span>
                  <span className="ml-1 italic text-gray-500">"{guess.guess}"</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No hubo adivinanzas incorrectas</p>
          )}
        </div>
      </div>
      
      {/* Tabla de puntuaciones */}
      <div className="w-full max-w-md mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Puntuaciones</h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">Jugador</th>
                <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">+Puntos</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {roundScores.map((player, index) => (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-4 text-sm">
                    <div className="flex items-center">
                      <span 
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: player.avatarColor }}
                      ></span>
                      {player.username}
                      {player.id === state.currentDrawerId && (
                        <span className="ml-1 text-xs text-gray-500">(Dibujante)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center text-sm">
                    {player.pointsEarned > 0 && (
                      <span className="text-green-600">+{player.pointsEarned}</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right text-sm font-medium">{player.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Botón para siguiente ronda (solo para host) */}
      {isHost && (
        <button
          onClick={handleNextAction}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          {state.currentRound === state.totalRounds 
            ? 'Finalizar Juego' 
            : 'Siguiente Ronda'}
        </button>
      )}
    </div>
  );
} 