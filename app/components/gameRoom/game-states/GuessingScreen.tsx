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
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-md p-8">
        {isPaused ? (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
              <p className="text-gray-600">Esperando a que se reanude...</p>
            </div>
          </div>
        ) : null}
        
        <svg className="w-16 h-16 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-6">¡Tu dibujo está siendo adivinado!</h2>
        <p className="text-lg text-gray-600 mb-4">Espera mientras los demás jugadores intentan adivinar tu dibujo.</p>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-md text-blue-600 mb-6">
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
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-6">
      {isPaused ? (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
            <p className="text-gray-600">Esperando a que se reanude...</p>
          </div>
        </div>
      ) : null}
      
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ¡Adivina el dibujo!
        </h2>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">
            Tiempo: {Math.ceil(timeRemaining / 1000)}s
          </p>
          <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${timePercentage}%`, transition: 'width 1s linear' }}
            />
          </div>
        </div>
      </div>
      
      {/* Área de dibujo */}
      <div className="w-full relative border-2 border-gray-300 rounded-lg overflow-hidden mb-6" style={{ height: '350px' }}>
        {currentDrawing ? (
          <img 
            src={currentDrawing.imageData} 
            alt="Dibujo para adivinar" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <p className="text-gray-500">El dibujo se está cargando...</p>
          </div>
        )}
      </div>
      
      {/* Artista actual */}
      <div className="w-full text-center mb-6">
        <p className="text-gray-600">
          Dibujante: <span className="font-medium">{state.players.find(p => p.id === state.currentDrawerId)?.username || 'Desconocido'}</span>
        </p>
      </div>
      
      {/* Formulario de adivinanza */}
      <form onSubmit={handleGuessSubmit} className="w-full mb-4">
        <div className="flex">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder={guessSubmitted ? "¡Adivinanza enviada!" : "¿Qué está dibujando?"}
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={guessSubmitted || isPaused}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-r-lg font-medium ${
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
          <p className="text-green-600 text-sm mt-2">
            ¡Tu adivinanza ha sido enviada! Espera los resultados.
          </p>
        )}
      </form>
    </div>
  );
} 