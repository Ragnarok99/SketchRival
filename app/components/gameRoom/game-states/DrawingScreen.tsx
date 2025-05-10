'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useGameState } from '../../../contexts/GameStateContext';
import ChatBox from '../ChatBox';

interface DrawingScreenProps {
  isPaused?: boolean;
}

export default function DrawingScreen({ isPaused = false }: DrawingScreenProps) {
  const { state, submitDrawing, isCurrentDrawer } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
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
    if (!canvasRef.current || !ctx || !canvasContainerRef.current) return;
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageData && canvas.width > 0 && canvas.height > 0 && imageData.width > 0 && imageData.height > 0) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = imageData.width;
          srcCanvas.height = imageData.height;
          const srcCtx = srcCanvas.getContext('2d');
          
          if (srcCtx) {
            srcCtx.putImageData(imageData, 0, 0);
            tempCtx.drawImage(srcCanvas, 0, 0, imageData.width, imageData.height, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      } catch (error) {
        console.error('Error al redimensionar el dibujo:', error);
      }
    }
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
      // Usar dimensiones del contenedor para el primer pintado si es posible
      if (canvasContainerRef.current) {
        context.fillRect(0, 0, canvasContainerRef.current.offsetWidth, canvasContainerRef.current.offsetHeight);
      } else {
        context.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }
    }

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
    if (ctx && canvasContainerRef.current) {
        const timeoutId = setTimeout(resizeCanvas, 50);
        return () => clearTimeout(timeoutId);
    }
  }, [ctx]); // Se ejecuta cuando ctx se establece
  
  // Eventos de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isCurrentDrawer || isPaused || !ctx) return;
    
    setIsDrawing(true);
    
    // Obtener posición
    const pos = getPointerPosition(e);
    setLastPos(pos);
    
    // Dibujar punto inicial
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = currentColor;
    ctx.fill();
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isCurrentDrawer || isPaused || !ctx) return;
    
    const pos = getPointerPosition(e);
    
    // Dibujar línea
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    setLastPos(pos);
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
  
  // Comprimir imagen para reducir tamaño de datos
  const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        let maxDimension = 800;
        let width = canvas.width;
        let height = canvas.height;
        let needsResize = width > maxDimension || height > maxDimension;
        let targetCanvas = canvas;

        if (needsResize) {
          const tempSizedCanvas = document.createElement('canvas');
          if (width > height) {
            tempSizedCanvas.width = maxDimension;
            tempSizedCanvas.height = Math.floor(height * (maxDimension / width));
          } else {
            tempSizedCanvas.height = maxDimension;
            tempSizedCanvas.width = Math.floor(width * (maxDimension / height));
          }
          const tempSizedCtx = tempSizedCanvas.getContext('2d');
          if (!tempSizedCtx) throw new Error('No se pudo crear contexto para redimensionar');
          tempSizedCtx.fillStyle = '#ffffff';
          tempSizedCtx.fillRect(0, 0, tempSizedCanvas.width, tempSizedCanvas.height);
          tempSizedCtx.drawImage(canvas, 0, 0, width, height, 0, 0, tempSizedCanvas.width, tempSizedCanvas.height);
          targetCanvas = tempSizedCanvas;
        }
        const dataURL = targetCanvas.toDataURL('image/jpeg', quality);
        resolve(dataURL);
      } catch (error) {
        // Si hay error en la compresión, intentar sin comprimir
        try {
          const fallbackDataURL = canvas.toDataURL('image/png');
          resolve(fallbackDataURL);
        } catch (fallbackError) {
          reject(error || fallbackError);
        }
      }
    });
  };
  
  // Enviar dibujo
  const handleSubmit = async () => {
    if (!canvasRef.current) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Comprimir imagen antes de enviar
      const compressedImageData = await compressImage(canvasRef.current);
      
      // Enviar imagen comprimida
      await submitDrawing(compressedImageData);
    } catch (error) {
      console.error('Error al enviar dibujo:', error);
      setSubmitError('Error al enviar el dibujo. Por favor intenta de nuevo.');
      
      // Intentar de nuevo con menor calidad o sin compresión si falló
      try {
        const fallbackImageData = canvasRef.current.toDataURL('image/png');
        await submitDrawing(fallbackImageData);
        setSubmitError(null); // Limpiar error si el segundo intento funciona
      } catch (retryError) {
        console.error('Error en segundo intento de envío:', retryError);
        setSubmitError('No se pudo enviar el dibujo. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Vista para quien no dibuja (observador)
  if (!isCurrentDrawer) {
    const wordToGuess = state.currentWord || '';
    const placeholder = wordToGuess.length > 0 ? Array(wordToGuess.length).fill('_').join(' ') : '???';
    return (
      <div className="flex flex-col lg:flex-row gap-4 p-4 w-full max-w-6xl mx-auto">
        <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px] bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
          <div className="animate-pulse mb-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4 text-center">
            {isPaused ? 'Juego pausado' : 'Observando...'}
          </h2>
          <p className="text-md sm:text-lg text-gray-600 mb-6 text-center">
            {isPaused 
              ? 'Esperando a que se reanude el juego' 
              : `${state.players.find(p => p.id === state.currentDrawerId)?.username || 'Alguien'} está dibujando ahora`
            }
          </p>
          <p className="text-sm sm:text-md text-blue-600 mb-2">
            Palabra: <span className="font-bold tracking-widest">{placeholder}</span>
          </p>
          <div className="w-full max-w-md h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${timePercentage}%`, transition: 'width 1s linear' }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Tiempo restante: {Math.ceil(timeRemaining / 1000)} segundos</p>
        </div>
        <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0">
          <ChatBox roomId={state.roomId} />
        </div>
      </div>
    );
  }
  
  // Vista para el dibujante
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 sm:p-4 w-full max-w-6xl mx-auto">
      {/* Columna Principal (Canvas y Herramientas) */}
      <div className="flex-grow flex flex-col items-center bg-white rounded-lg shadow-md p-2 sm:p-4">
        {isPaused && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Juego pausado</h3>
              <p className="text-gray-600">Esperando a que se reanude...</p>
            </div>
          </div>
        )}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-4">
          <div className="text-center sm:text-left mb-2 sm:mb-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">¡Es tu turno de dibujar!</h2>
            <p className="text-sm sm:text-md text-blue-600">
              Dibuja: <span className="font-bold">{state.currentWord}</span>
            </p>
          </div>
          
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
        <div ref={canvasContainerRef} className="w-full aspect-video sm:aspect-[4/3] md:aspect-[16/9] border-2 border-gray-300 rounded-lg overflow-hidden mb-2 sm:mb-4 relative bg-white">
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
        <div className="w-full flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-2 sm:mb-4 items-center justify-center">
          <div className="flex space-x-1 sm:space-x-2 items-center">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Color:</span>
            <div className="flex flex-wrap justify-center gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border ${color === currentColor ? 'border-black border-2 ring-2 ring-blue-500' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex space-x-1 sm:space-x-2 items-center mt-2 sm:mt-0">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Tamaño:</span>
            <div className="flex space-x-1 items-center">
              {brushSizes.map(size => (
                <button
                  key={size}
                  className={`rounded-full flex items-center justify-center ${brushSize === size ? 'bg-gray-300 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}
                  style={{ width: size + 8, height: size + 8 }}
                  onClick={() => setBrushSize(size)}
                  aria-label={`Tamaño ${size}`}
                >
                  <div className="rounded-full bg-black" style={{ width: size, height: size }} />
                </button>
              ))}
            </div>
          </div>
          
          <button
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white rounded mt-2 sm:mt-0 sm:ml-auto"
            onClick={clearCanvas}
          >
            Limpiar
          </button>
        </div>
        
        {submitError && (
          <div className="w-full mb-2 sm:mb-3 p-2 bg-red-100 border-l-4 border-red-500 text-red-700 text-xs sm:text-sm">
            <p>{submitError}</p>
          </div>
        )}
        
        <button
          className={`w-full py-2.5 sm:py-3 text-white font-medium rounded-lg transition text-sm sm:text-base ${
            isSubmitting 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar dibujo'}
        </button>
      </div>
      
      {/* Columna de Chat (solo para el dibujante, ya que los observadores no interactúan con el chat según esta pantalla) */}
      <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 mt-4 lg:mt-0">
        <ChatBox roomId={state.roomId} />
      </div>
    </div>
  );
} 