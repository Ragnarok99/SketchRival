'use client';

import React from 'react';
import { useGameState } from '../../../contexts/GameStateContext';

export default function WordSelection() {
  const { state, selectWord, isCurrentDrawer } = useGameState();
  const options = state.wordOptions || [];
  const timeRemaining = state.timeRemaining;
  
  // Calcular el porcentaje de tiempo restante
  const maxTimeForPhase = state.currentPhaseMaxTime && state.currentPhaseMaxTime > 0 ? state.currentPhaseMaxTime : 30;
  const timePercentage = Math.max(0, Math.min(100, (timeRemaining / (maxTimeForPhase * 1000)) * 100));
  
  // Si no es el jugador que debe dibujar, mostrar pantalla de espera
  if (!isCurrentDrawer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
        <div className="animate-bounce mb-4">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 text-center">Esperando selección de palabra</h2>
        <p className="text-md sm:text-lg text-gray-600 text-center">
          El jugador {state.players.find(p => p.id === state.currentDrawerId)?.username || 'actual'} está eligiendo una palabra...
        </p>
        
        {/* Barra de progreso */}
        <div className="w-full max-w-md h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${timePercentage}%`, transition: 'width 1s linear' }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Tiempo restante: {Math.ceil(timeRemaining / 1000)} segundos
        </p>
      </div>
    );
  }
  
  // Pantalla de selección para el dibujante
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 text-center">¡Elige una palabra para dibujar!</h2>
      
      <div className="w-full max-w-md space-y-3 sm:space-y-4 mb-8">
        {options.map((word, index) => (
          <button
            key={index}
            onClick={() => selectWord(word)}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-500 rounded-lg text-md sm:text-lg font-medium text-center transition duration-200"
          >
            {word}
          </button>
        ))}
      </div>
      
      {/* Barra de progreso */}
      <div className="w-full max-w-md h-3 bg-gray-200 rounded-full mt-6 overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${timePercentage}%`, transition: 'width 1s linear' }}
        />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Tiempo restante: {Math.ceil(timeRemaining / 1000)} segundos
      </p>
      
      <p className="mt-6 text-sm sm:text-base text-gray-600 text-center">
        Si no eliges una palabra, se seleccionará una al azar.
      </p>
    </div>
  );
} 