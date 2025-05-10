'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useGameState } from '../../../contexts/GameStateContext';

interface DrawingScreenProps {
  isPaused?: boolean;
}

export default function DrawingScreen({ isPaused = false }: DrawingScreenProps) {
  const { state, submitDrawing, isCurrentDrawer } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  // Porcentaje de tiempo restante
  const timeRemaining = Math.max(0, state.timeRemaining);
  const maxTimeForPhase = state.currentPhaseMaxTime && state.currentPhaseMaxTime > 0 ? state.currentPhaseMaxTime : 60; // Fallback a 60s
  const timePercentage = Math.max(0, Math.min(100, (timeRemaining / (maxTimeForPhase * 1000)) * 100));
  
  // Colores disponibles para dibujar
  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ff9900', '#9900ff'
  ];
  
  // Tamaños de pincel
  const brushSizes = [2, 5, 10, 15, 20];
  
  // Función para ajustar el tamaño del canvas
  const resizeCanvas = () => {
    if (!canvasRef.current || !ctx) return;
    const canvas = canvasRef.current;
    // Guardar el contenido actual si es posible y se desea
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Restablecer propiedades del contexto que se pierden al redimensionar
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor; // Asumiendo que currentColor es el deseado
    ctx.lineWidth = brushSize; // Asumiendo que brushSize es el deseado
    ctx.fillStyle = '#ffffff'; // Restablecer fondo blanco
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Si se guardó la imagen, redibujarla:
    // if (imageData) ctx.putImageData(imageData, 0, 0);
    // Nota: Redibujar puede ser imperfecto o perder calidad. 
    // Una mejor solución sería re-ejecutar todos los trazos guardados.
    // Por simplicidad aquí, solo limpiamos y restablecemos el fondo.
  };

  // Inicializar y reajustar canvas al cambiar tamaño de ventana
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      setCtx(context);
      // Establecer propiedades iniciales del contexto aquí también si es necesario
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight); // Usar offsetWidth/Height para el primer pintado
    }

    // Llamada inicial para ajustar tamaño
    // Necesitamos un pequeño delay o asegurar que el layout esté estable
    // para que offsetWidth/offsetHeight sean correctos.
    // Por ahora, asumimos que el layout inicial es estable.
    // resizeCanvas(); // Se llama implícitamente por la configuración inicial de ctx y el useEffect de abajo.

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // Solo corre una vez para setear el contexto y el listener

  // Efecto separado para llamar a resizeCanvas cuando ctx está disponible y cambian las dimensiones del contenedor
  // Esto es un poco más complejo de hacer correctamente solo con useEffect y offsetWidth/Height
  // ya que offsetWidth/Height no disparan re-renders por sí mismos.
  // El listener de 'resize' es la forma más robusta.
  // Asegurarse que resizeCanvas se llama después de que el layout inicial esté establecido.
  useEffect(() => {
    // Esta llamada asegura que el canvas tome las dimensiones correctas después del primer render
    // y el establecimiento del contexto.
    if (ctx) {
        const timeoutId = setTimeout(resizeCanvas, 50); // Pequeño delay para asegurar que el DOM está estable
        return () => clearTimeout(timeoutId);
    }
  }, [ctx]); // Se ejecuta cuando ctx se establece
  
  // Eventos de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isCurrentDrawer || isPaused) return;
    
    setIsDrawing(true);
    
    // Obtener posición
    const pos = getPointerPosition(e);
    setLastPos(pos);
    
    // Dibujar punto inicial
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = currentColor;
      ctx.fill();
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isCurrentDrawer || isPaused) return;
    
    const pos = getPointerPosition(e);
    
    if (ctx) {
      // Dibujar línea
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      setLastPos(pos);
    }
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  // Obtener posición del puntero (mouse o touch)
  const getPointerPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Evento de mouse
    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    
    // Evento touch
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return { x: 0, y: 0 };
  };
  
  // Limpiar canvas
  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };
  
  // Enviar dibujo
  const handleSubmit = () => {
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    submitDrawing(imageData);
  };
  
  // Renderizar pantalla para quien no dibuja
  if (!isCurrentDrawer) {
    const wordToGuess = state.currentWord || '';
    const wordLength = wordToGuess.length;
    const placeholder = wordLength > 0 ? Array(wordLength).fill('_').join(' ') : '???';

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-md p-8">
        <div className="animate-pulse mb-4">
          <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {isPaused ? 'Juego pausado' : 'Observando...'}
        </h2>
        
        <p className="text-lg text-gray-600 mb-6">
          {isPaused 
            ? 'Esperando a que se reanude el juego' 
            : `${state.players.find(p => p.id === state.currentDrawerId)?.username || 'Alguien'} está dibujando ahora`
          }
        </p>
        
        <p className="text-md text-blue-600 mb-2">
          Palabra: <span className="font-bold tracking-widest">{placeholder}</span>
        </p>
        
        {/* Barra de tiempo */}
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
  
  // Renderizar pantalla para el dibujante
  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-4">
      {isPaused ? (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
            <p className="text-gray-600">Esperando a que se reanude...</p>
          </div>
        </div>
      ) : null}
      
      <div className="w-full flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">¡Es tu turno de dibujar!</h2>
          <p className="text-md text-blue-600">
            Dibuja: <span className="font-bold">{state.currentWord}</span>
          </p>
        </div>
        
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
      
      {/* Contenedor del canvas */}
      <div className="relative w-full border-2 border-gray-300 rounded-lg overflow-hidden mb-4" style={{ height: '400px' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      
      {/* Herramientas de dibujo */}
      <div className="w-full flex flex-wrap gap-4 mb-4">
        <div className="flex space-x-2 items-center">
          <span className="text-sm font-medium text-gray-700">Color:</span>
          <div className="flex space-x-1">
            {colors.map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border ${color === currentColor ? 'border-black border-2' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2 items-center">
          <span className="text-sm font-medium text-gray-700">Tamaño:</span>
          <div className="flex space-x-1 items-center">
            {brushSizes.map(size => (
              <button
                key={size}
                className={`rounded-full flex items-center justify-center ${brushSize === size ? 'bg-gray-200' : ''}`}
                style={{ width: size + 10, height: size + 10 }}
                onClick={() => setBrushSize(size)}
                aria-label={`Tamaño ${size}`}
              >
                <div
                  className="rounded-full bg-black"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>
        </div>
        
        <button
          className="ml-auto px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
          onClick={clearCanvas}
        >
          Limpiar
        </button>
      </div>
      
      {/* Botón de enviar */}
      <button
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        onClick={handleSubmit}
      >
        Enviar dibujo
      </button>
    </div>
  );
} 