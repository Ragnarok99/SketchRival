'use client';

import React, { useEffect, useState } from 'react';
import { useGameState } from '../../../contexts/GameStateContext';

export default function StartingGame() {
  const { state } = useGameState();
  const [countdown, setCountdown] = useState(3);

  // Efecto para la cuenta atrás
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">¡Preparando el juego!</h2>
      
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl font-bold text-blue-600">{countdown}</div>
        </div>
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
          <circle 
            className="text-gray-200" 
            strokeWidth="4" 
            stroke="currentColor" 
            fill="transparent" 
            r="45" 
            cx="50" 
            cy="50" 
          />
          <circle 
            className="text-blue-600" 
            strokeWidth="4" 
            strokeDasharray="283" 
            strokeDashoffset={283 - (283 * countdown) / 3} 
            strokeLinecap="round" 
            stroke="currentColor" 
            fill="transparent" 
            r="45" 
            cx="50" 
            cy="50" 
          />
        </svg>
      </div>
      
      <p className="text-lg text-gray-600">
        ¡Prepárate para dibujar y adivinar!
      </p>
      
      <div className="mt-8 text-center">
        <h3 className="text-lg font-medium mb-2">Jugadores: {state.players.length}</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map(player => (
            <div 
              key={player.id} 
              className="py-1 px-3 bg-gray-100 rounded-full text-sm"
              style={{ borderLeft: `4px solid ${player.avatarColor}` }}
            >
              {player.username}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 