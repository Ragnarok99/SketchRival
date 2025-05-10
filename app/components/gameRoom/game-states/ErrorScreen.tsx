'use client';

import React from 'react';

interface ErrorScreenProps {
  error?: {
    message: string;
    code: string;
  };
  onLeaveRoom: () => void;
}

export default function ErrorScreen({ error, onLeaveRoom }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-md p-8">
      <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el juego</h2>
      <p className="text-red-600 mb-1">{error?.message || 'Ha ocurrido un error inesperado'}</p>
      {error?.code && (
        <p className="text-gray-500 text-sm mb-4">Código: {error.code}</p>
      )}
      
      <div className="mt-4">
        <button
          onClick={onLeaveRoom}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Volver a la lista de salas
        </button>
      </div>
    </div>
  );
} 