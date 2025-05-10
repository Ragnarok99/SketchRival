'use client';

import React from 'react';
import { useGameState } from '../../../contexts/GameStateContext';
import confetti from 'canvas-confetti';
import DrawingGallery from '../DrawingGallery';

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
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, angle: 90, startVelocity: 30 });
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.5 }, angle: 90, startVelocity: 25 }), 500);
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
  
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd

  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-4xl mx-auto my-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 text-center">¡Fin del Juego!</h2>
      <p className="text-md sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center">Gracias por jugar</p>
      
      {/* Podio de ganadores - Flex para pantallas grandes, se apila en pequeñas */}
      {finalScores.length > 0 && (
        <div className="w-full flex flex-col sm:flex-row justify-center items-end sm:space-x-2 md:space-x-4 mb-6 sm:mb-8">
          {podiumOrder.map(placeIndex => {
            if (finalScores.length <= placeIndex) return null;
            const player = finalScores[placeIndex];
            const place = placeIndex === 0 ? 1 : (placeIndex === 1 ? 2 : 3);
            let podiumStyles = '';
            let avatarSize = 'w-12 h-12 sm:w-14 sm:h-14';
            let pedestalHeight = 'h-16 sm:h-20';
            let pedestalWidth = 'w-16 sm:w-20';
            let orderClass = 'order-2 sm:order-' + (place === 1 ? '2' : (place === 2 ? '1' : '3'));
            let crown = place === 1;

            if (place === 1) {
              podiumStyles = 'bg-gold';
              avatarSize = 'w-14 h-14 sm:w-16 sm:h-16';
              pedestalHeight = 'h-24 sm:h-28';
              pedestalWidth = 'w-20 sm:w-24';
            } else if (place === 2) {
              podiumStyles = 'bg-silver';
            } else {
              podiumStyles = 'bg-bronze';
              pedestalHeight = 'h-12 sm:h-16';
            }

            return (
              <div key={player.id} className={`flex flex-col items-center mx-1 sm:mx-0 ${orderClass} ${place === 1 ? '-mb-4 sm:-mb-0 sm:-mt-6' : 'mb-2 sm:mb-0'}`}>
                {crown && (
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                )}
                <div 
                  className={`${avatarSize} rounded-full border-2 sm:border-4 ${place === 1 ? 'border-yellow-400' : 'border-white'} shadow-md flex items-center justify-center text-white font-bold text-lg sm:text-xl z-10`}
                  style={{ backgroundColor: player.avatarColor }}
                >
                  {place}
                </div>
                <div className={`${podiumStyles} ${pedestalHeight} ${pedestalWidth} flex items-center justify-center rounded-t-lg -mt-3 sm:-mt-4 pt-2 sm:pt-3`}>
                  <div className="text-center px-1">
                    <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[60px] sm:max-w-[72px]">{player.username}</p>
                    <p className="text-xs font-bold text-white">{player.score} pts</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Mensaje al ganador */}
      {winners.length === 1 ? (
        <div className="w-full max-w-md bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-indigo-800 mb-1">¡{winners[0].username} ha ganado!</h3>
          <p className="text-sm sm:text-base text-gray-700">Con un total de {winners[0].score} puntos</p>
        </div>
      ) : winners.length > 1 ? (
        <div className="w-full max-w-md bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-indigo-800 mb-1">¡Empate!</h3>
          <p className="text-sm sm:text-base text-gray-700">
            {winners.map(w => w.username).join(' y ')} han empatado con {winningScore} puntos
          </p>
        </div>
      ) : finalScores.length === 0 && (
        <div className="w-full max-w-md bg-gray-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center">
            <p className="text-gray-700">No hay puntuaciones para mostrar.</p>
        </div>
      )}
      
      {/* Tabla de puntuaciones completa */}
      {finalScores.length > 0 && (
        <div className="w-full max-w-lg mb-4 sm:mb-6">
          <h3 className="text-md sm:text-lg font-medium text-gray-800 mb-2 text-center sm:text-left">Puntuaciones Finales</h3>
          <div className="bg-gray-50 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full min-w-[400px] sm:min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-1.5 px-2 sm:py-2 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600">Pos</th>
                  <th className="py-1.5 px-2 sm:py-2 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600">Jugador</th>
                  <th className="py-1.5 px-2 sm:py-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-600">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {finalScores.map((player, index) => (
                  <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-4 text-center text-xs sm:text-sm font-medium">{index + 1}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-4 text-xs sm:text-sm">
                      <div className="flex items-center">
                        <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2" style={{ backgroundColor: player.avatarColor }}></span>
                        <span className="truncate max-w-[100px] sm:max-w-xs">{player.username}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-4 text-right text-xs sm:text-sm font-medium">{player.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Estadísticas del juego */}
      <div className="w-full max-w-lg grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalDrawings}</p>
          <p className="text-xs text-gray-600">Dibujos</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-green-600">{correctGuesses}</p>
          <p className="text-xs text-gray-600">Aciertos</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-purple-600">{accuracy}%</p>
          <p className="text-xs text-gray-600">Precisión</p>
        </div>
      </div>
      
      {/* Galería de Dibujos */}
      <DrawingGallery drawings={state.drawings} players={state.players} />
      
      {/* Botón para volver a la sala de espera */}
      <button
        onClick={onLeaveRoom}
        className="mt-4 sm:mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm sm:text-base"
      >
        Volver a la lista de salas
      </button>
    </div>
  );
} 