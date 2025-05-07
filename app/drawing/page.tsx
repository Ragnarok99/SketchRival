'use client';

import Canvas from "../components/drawing/Canvas";
import OptimizedCanvas from "../components/drawing/OptimizedCanvas";
import { useState } from "react";

export default function DrawingPage() {
  const [useOptimized, setUseOptimized] = useState(true);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        SketchRival - Canvas de Dibujo
      </h1>
      <p className="text-center text-gray-600 mb-6">
        Selecciona una herramienta y comienza a dibujar. Usa las diferentes
        herramientas para crear tu obra maestra.
      </p>

      {/* Toggle entre canvas normal y optimizado */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            className={`px-4 py-2 rounded ${
              !useOptimized
                ? "bg-white shadow-sm font-medium"
                : "text-gray-600"
            }`}
            onClick={() => setUseOptimized(false)}
          >
            Canvas Estándar
          </button>
          <button
            className={`px-4 py-2 rounded ${
              useOptimized
                ? "bg-white shadow-sm font-medium"
                : "text-gray-600"
            }`}
            onClick={() => setUseOptimized(true)}
          >
            Canvas Optimizado
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="max-w-4xl w-full">
          {useOptimized ? (
            <OptimizedCanvas width={800} height={600} className="shadow-lg" />
          ) : (
            <Canvas width={800} height={600} className="shadow-lg" />
          )}
        </div>
      </div>
      
      {useOptimized && (
        <div className="mt-2 text-center text-xs text-blue-600">
          <p>
            Usando versión optimizada con capas, throttling y requestAnimationFrame.
            Presiona Ctrl+P para mostrar estadísticas de rendimiento.
          </p>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Dibuja una representación para el prompt que recibirás, la IA evaluará
          qué tan bien lo hiciste.
        </p>
        <p className="mt-2">
          Tip: prueba diferentes herramientas para mejorar tus dibujos.
        </p>
      </div>
    </div>
  );
}

