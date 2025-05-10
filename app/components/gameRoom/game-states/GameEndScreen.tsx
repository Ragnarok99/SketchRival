'use client';

import React from 'react';
import { useGameState } from '../../../contexts/GameStateContext';
import confetti from 'canvas-confetti';

interface GameEndScreenProps {
  onLeaveRoom: () => void;
}

export default function GameEndScreen({ onLeaveRoom }: GameEndScreenProps) {
  const { state } = useGameState();
  
  // Calcular puntuaciones finales
  const finalScores = [...state.players]
    .map(player => ({
      ...player,
      score: state.scores[player.id] || 0
    }))
    .sort((a, b) => b.score - a.score);
  
  // Determinar ganador(es) - puede haber empate
  const winningScore = finalScores.length > 0 ? finalScores[0].score : 0;
  const winners = finalScores.filter(player => player.score === winningScore);
  
  // Activar confetti para celebrar
  React.useEffect(() => {
    if (typeof window !== 'undefined' && winners.length > 0) {
      // Lanzar confetti
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 }
      });
      
      // Lanzar más confetti con un pequeño retraso
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 60,
          origin: { y: 0.7 }
        });
      }, 700);
    }
  }, [winners]);
  
  // Obtener estadísticas
  const totalDrawings = state.drawings.length;
  const totalGuesses = state.guesses.length;
  const correctGuesses = state.guesses.filter(guess => guess.correct).length;
  const accuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
  
  // Estilos para colores metálicos de los podios
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = 'game-end-podium-styles';
    if (document.getElementById(styleId)) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
    .bg-gold {
      background: linear-gradient(45deg, #FFD700, #FFC107, #FFD700);
    }
    .bg-silver {
      background: linear-gradient(45deg, #C0C0C0, #A9A9A9, #C0C0C0);
    }
    .bg-bronze {
      background: linear-gradient(45deg, #CD7F32, #A46628, #CD7F32);
    }
    `;
    
    document.head.appendChild(styleEl);
    
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.parentNode?.removeChild(element);
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Fin del Juego!</h2>
      <p className="text-lg text-gray-600 mb-8">Gracias por jugar</p>
      
      {/* Podio de ganadores */}
      <div className="w-full max-w-md flex justify-center items-end space-x-4 mb-8">
        {/* Segundo lugar */}
        {finalScores.length > 1 && (
          <div className="flex flex-col items-center">
            <div 
              className="w-14 h-14 rounded-full border-4 border-white shadow-md flex items-center justify-center"
              style={{ backgroundColor: finalScores[1].avatarColor }}
            >
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <div className="bg-silver h-20 w-20 flex items-center justify-center rounded-t-lg mt-2">
              <div className="text-center">
                <p className="text-sm font-medium text-white truncate max-w-[72px] px-1">{finalScores[1].username}</p>
                <p className="text-xs font-bold text-white">{finalScores[1].score} pts</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Primer lugar */}
        {finalScores.length > 0 && (
          <div className="flex flex-col items-center -mt-8">
            <svg className="w-10 h-10 text-yellow-500 mb-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <div 
              className="w-16 h-16 rounded-full border-4 border-yellow-500 shadow-md flex items-center justify-center"
              style={{ backgroundColor: finalScores[0].avatarColor }}
            >
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <div className="bg-gold h-28 w-24 flex items-center justify-center rounded-t-lg mt-2">
              <div className="text-center">
                <p className="text-sm font-medium text-white truncate max-w-[80px] px-1">{finalScores[0].username}</p>
                <p className="text-sm font-bold text-white">{finalScores[0].score} pts</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tercer lugar */}
        {finalScores.length > 2 && (
          <div className="flex flex-col items-center">
            <div 
              className="w-14 h-14 rounded-full border-4 border-white shadow-md flex items-center justify-center"
              style={{ backgroundColor: finalScores[2].avatarColor }}
            >
              <span className="text-white font-bold text-xl">3</span>
            </div>
            <div className="bg-bronze h-16 w-20 flex items-center justify-center rounded-t-lg mt-2">
              <div className="text-center">
                <p className="text-sm font-medium text-white truncate max-w-[72px] px-1">{finalScores[2].username}</p>
                <p className="text-xs font-bold text-white">{finalScores[2].score} pts</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Mensaje al ganador */}
      {winners.length === 1 ? (
        <div className="w-full max-w-md bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 mb-6 text-center">
          <h3 className="text-xl font-bold text-indigo-800 mb-1">¡{winners[0].username} ha ganado!</h3>
          <p className="text-gray-700">Con un total de {winners[0].score} puntos</p>
        </div>
      ) : winners.length > 1 ? (
        <div className="w-full max-w-md bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 mb-6 text-center">
          <h3 className="text-xl font-bold text-indigo-800 mb-1">¡Empate!</h3>
          <p className="text-gray-700">
            {winners.map(w => w.username).join(' y ')} han empatado con {winningScore} puntos
          </p>
        </div>
      ) : null}
      
      {/* Tabla de puntuaciones completa */}
      <div className="w-full max-w-md mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Puntuaciones Finales</h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-center text-sm font-medium text-gray-600">Pos</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">Jugador</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {finalScores.map((player, index) => (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-4 text-center text-sm font-medium">
                    {index + 1}
                  </td>
                  <td className="py-2 px-4 text-sm">
                    <div className="flex items-center">
                      <span 
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: player.avatarColor }}
                      ></span>
                      {player.username}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right text-sm font-medium">{player.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Estadísticas del juego */}
      <div className="w-full max-w-md grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalDrawings}</p>
          <p className="text-xs text-gray-600">Dibujos</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{correctGuesses}</p>
          <p className="text-xs text-gray-600">Aciertos</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{accuracy}%</p>
          <p className="text-xs text-gray-600">Precisión</p>
        </div>
      </div>
      
      {/* Botón para volver a la sala de espera */}
      <button
        onClick={onLeaveRoom}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
      >
        Volver a la lista de salas
      </button>
    </div>
  );
} 