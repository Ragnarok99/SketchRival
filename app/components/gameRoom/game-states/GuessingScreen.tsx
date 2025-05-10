'use client';

import React, { useState } from 'react';
import { useGameState } from '../../../contexts/GameStateContext';

interface GuessingScreenProps {
  isPaused?: boolean;
}

export default function GuessingScreen({ isPaused = false }: GuessingScreenProps) {
  const { state, submitGuess, isCurrentDrawer } = useGameState();
  const [guessInput, setGuessInput] = useState('');
  const [guessSubmitted, setGuessSubmitted] = useState(false);
  
  // Calcular tiempo restante
  const timeRemaining = Math.max(0, state.timeRemaining);
  const maxTimeForPhase = state.currentPhaseMaxTime && state.currentPhaseMaxTime > 0 ? state.currentPhaseMaxTime : 60; // Fallback a 60s
  const timePercentage = Math.max(0, Math.min(100, (timeRemaining / (maxTimeForPhase * 1000)) * 100));
  
  // Manejar envío de adivinanza
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (guessInput.trim() === '' || guessSubmitted) return;
    
    submitGuess(guessInput.trim());
    setGuessSubmitted(true);
    setGuessInput('');
  };
  
  // Obtener sugerencias de adivinanzas previas
  const previousGuesses = state.guesses
    .filter(guess => guess.userId === state.currentDrawerId)
    .slice(-5)
    .map(guess => guess.guess);
  
  // Encontrar el dibujo actual
  const currentDrawing = state.drawings.find(
    drawing => drawing.userId === state.currentDrawerId && 
    drawing.round === state.currentRound
  );
  
  // Pantalla para el dibujante (debe esperar)
  if (isCurrentDrawer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
        {isPaused ? (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
              <p className="text-gray-600">Esperando a que se reanude...</p>
            </div>
          </div>
        ) : null}
        
        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 text-center">¡Tu dibujo está siendo adivinado!</h2>
        <p className="text-md sm:text-lg text-gray-600 mb-4 text-center">Espera mientras los demás jugadores intentan adivinar tu dibujo.</p>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-sm sm:text-md text-blue-600 mb-6">
            Dibujaste: <span className="font-bold">{state.currentWord}</span>
          </p>
          
          {/* Contador de tiempo */}
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
      </div>
    );
  }
  
  // Pantalla para los que adivinan
  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-2xl mx-auto">
      {isPaused ? (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
            <p className="text-gray-600">Esperando a que se reanude...</p>
          </div>
        </div>
      ) : null}
      
      <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left mb-2 sm:mb-0">
          ¡Adivina el dibujo!
        </h2>
        
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm text-gray-500">
            Tiempo: {Math.ceil(timeRemaining / 1000)}s
          </p>
          <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden mx-auto sm:mx-0">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${timePercentage}%`, transition: 'width 1s linear' }}
            />
          </div>
        </div>
      </div>
      
      {/* Área de dibujo */}
      <div className="w-full aspect-video sm:aspect-[4/3] md:aspect-[16/9] relative border-2 border-gray-300 rounded-lg overflow-hidden mb-4 sm:mb-6 bg-gray-100">
        {currentDrawing ? (
          <img 
            src={currentDrawing.imageData} 
            alt="Dibujo para adivinar" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 italic">El dibujo se está cargando o no está disponible...</p>
          </div>
        )}
      </div>
      
      {/* Artista actual */}
      <div className="w-full text-center mb-4 sm:mb-6">
        <p className="text-sm sm:text-base text-gray-600">
          Dibujante: <span className="font-medium">{state.players.find(p => p.id === state.currentDrawerId)?.username || 'Desconocido'}</span>
        </p>
      </div>
      
      {/* Formulario de adivinanza */}
      <form onSubmit={handleGuessSubmit} className="w-full max-w-lg mb-4">
        <div className="flex">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder={guessSubmitted ? "¡Adivinanza enviada!" : "¿Qué está dibujando?"}
            className="flex-grow px-3 sm:px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            disabled={guessSubmitted || isPaused}
          />
          <button
            type="submit"
            className={`px-3 sm:px-4 py-2 rounded-r-lg font-medium text-sm sm:text-base ${
              guessSubmitted || isPaused 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={guessSubmitted || isPaused}
          >
            Adivinar
          </button>
        </div>
        
        {guessSubmitted && (
          <p className="text-green-600 text-xs sm:text-sm mt-2 text-center sm:text-left">
            ¡Tu adivinanza ha sido enviada! Espera los resultados.
          </p>
        )}
      </form>
    </div>
  );
} 