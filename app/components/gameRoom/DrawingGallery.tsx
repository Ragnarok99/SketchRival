'use client';

import React, { useState } from 'react';
import Image from 'next/image'; // Usar next/image para optimización si las URLs son externas o se pueden optimizar
import { Drawing, Player } from '../../contexts/GameStateContext'; // Corregir ruta

interface DrawingGalleryProps {
  drawings: Drawing[];
  players: Player[]; // Para poder mostrar el nombre del dibujante
  // words?: Record<string, string>; // Opcional: un mapa de round/drawerId a la palabra, si se quiere mostrar
}

interface GalleryItem extends Drawing {
  drawerName?: string;
  // word?: string;
}

export default function DrawingGallery({ drawings, players }: DrawingGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!drawings || drawings.length === 0) {
    return <p className="text-center text-gray-600 my-4">No hay dibujos para mostrar.</p>;
  }

  const galleryItems: GalleryItem[] = drawings.map(d => {
    const player = players.find(p => p.id === d.userId);
    return {
      ...d,
      drawerName: player?.username || 'Desconocido',
      // word: words?.[`${d.round}-${d.userId}`] // Lógica de ejemplo si se pasaran las palabras
    };
  });

  return (
    <div className="my-8">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Galería de Dibujos de la Partida</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {galleryItems.map((item, index) => (
          <div 
            key={index} 
            className="aspect-square bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedImage(item.imageData)}
          >
            <img 
              src={item.imageData} 
              alt={`Dibujo de ${item.drawerName} - Ronda ${item.round}`}
              className="w-full h-full object-contain p-1"
            />
            {/* Opcional: Mostrar info debajo o al hacer hover 
            <div className="p-1 text-xs text-center bg-gray-50">
              <p>{item.drawerName}</p>
              <p>Ronda: {item.round}</p>
            </div>
            */}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)} // Cerrar al hacer clic fuera
        >
          <div 
            className="bg-white p-4 rounded-lg shadow-xl max-w-3xl max-h-[80vh] relative"
            onClick={(e) => e.stopPropagation()} // Evitar que el clic dentro cierre el modal
          >
            <img src={selectedImage} alt="Dibujo seleccionado" className="max-w-full max-h-[75vh] object-contain" />
            <button 
              onClick={() => setSelectedImage(null)} 
              className="absolute top-2 right-2 bg-gray-700 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center hover:bg-gray-800"
              aria-label="Cerrar imagen"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 