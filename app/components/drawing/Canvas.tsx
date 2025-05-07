"use client";

import { useRef, useEffect, useState, MouseEvent, TouchEvent, useCallback } from "react";
import Toolbar from "./Toolbar";
import { DrawingToolType, Point } from "./tools/DrawingTool";
import { ToolFactory } from "./tools/ToolFactory";
import { HistoryManager } from "./HistoryManager";

interface CanvasProps {
  width?: number;
  height?: number;
  className?: string;
  maxHistorySize?: number;
}

const Canvas = ({ 
  width = 800, 
  height = 600, 
  className = "",
  maxHistorySize = 30,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point | null>(null);

  // Estados para las propiedades de la herramienta
  const [activeTool, setActiveTool] = useState<DrawingToolType>("pencil");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [opacity, setOpacity] = useState(1);

  // Referencia a la herramienta activa
  const currentToolRef = useRef(
    ToolFactory.createTool(activeTool, { color, lineWidth, opacity }),
  );

  // Estados y referencias para el gestor de historial
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager(maxHistorySize));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoStackSize, setUndoStackSize] = useState(0);
  const [redoStackSize, setRedoStackSize] = useState(0);

  // Actualizar estados del historial
  const updateHistoryStates = useCallback(() => {
    const historyManager = historyManagerRef.current;
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
    setUndoStackSize(historyManager.getUndoStackSize());
    setRedoStackSize(historyManager.getRedoStackSize());
  }, []);

  // Actualizar la herramienta activa cuando cambien las propiedades
  useEffect(() => {
    currentToolRef.current = ToolFactory.createTool(activeTool, {
      color,
      lineWidth,
      opacity,
    });
  }, [activeTool, color, lineWidth, opacity]);

  // Inicializar el canvas cuando el componente se monta
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Configurar el contexto 2D
    const context = canvas.getContext("2d", {
      willReadFrequently: true, // Optimización para operaciones frecuentes de lectura
    });

    if (!context) {
      console.error("No se pudo obtener el contexto 2D del canvas");
      return;
    }

    // Establecer resolución correcta para pantallas de alta densidad de píxeles
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Escalar el contexto para mantener dimensiones visuales correctas
    context.scale(dpr, dpr);

    // Configuración inicial del lienzo
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Establecer el fondo blanco por defecto
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    setCtx(context);
    setIsInitialized(true);

    // Capturar el estado inicial
    if (canvas) {
      setTimeout(() => {
        historyManagerRef.current.captureState(canvas);
        updateHistoryStates();
      }, 100);
    }

    // Limpiar cuando el componente se desmonte o las dimensiones cambien
    return () => {
      setCtx(null);
      setIsInitialized(false);
    };
  }, [width, height, updateHistoryStates]);

  // Función para capturar el estado después de una acción
  const captureState = useCallback(() => {
    if (!canvasRef.current) return;
    historyManagerRef.current.captureState(canvasRef.current);
    updateHistoryStates();
  }, [updateHistoryStates]);

  // Método para limpiar el canvas
  const clearCanvas = useCallback(() => {
    if (!ctx || !canvasRef.current) return;
    // Capturar el estado antes de limpiar
    captureState();
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Capturar el estado después de limpiar
    captureState();
  }, [ctx, width, height, captureState]);

  // Funciones para deshacer y rehacer
  const handleUndo = useCallback(() => {
    if (!canvasRef.current || !ctx) return;
    
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        updateHistoryStates();
      };
      image.src = previousState;
    }
  }, [ctx, width, height, updateHistoryStates]);

  const handleRedo = useCallback(() => {
    if (!canvasRef.current || !ctx) return;
    
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        updateHistoryStates();
      };
      image.src = nextState;
    }
  }, [ctx, width, height, updateHistoryStates]);

  // Manejo de atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z para deshacer
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y para rehacer
      else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Obtener posición relativa del mouse o toque
  const getPosition = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    // Calcular posición relativa considerando el factor de escala
    const scaleX = canvas.width / (rect.width * window.devicePixelRatio || 1);
    const scaleY = canvas.height / (rect.height * window.devicePixelRatio || 1);

    return {
      x: ((clientX - rect.left) * scaleX) / window.devicePixelRatio,
      y: ((clientY - rect.top) * scaleY) / window.devicePixelRatio,
    };
  };

  // Manejadores de eventos para mouse
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const position = getPosition(e.clientX, e.clientY);
    if (!position || !ctx) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo
    currentToolRef.current.startDrawing(ctx, position);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition || !ctx) return;

    const currentPosition = getPosition(e.clientX, e.clientY);
    if (!currentPosition) return;

    // Usar la herramienta actual para continuar el dibujo
    currentToolRef.current.continueDrawing(ctx, lastPosition, currentPosition);
    setLastPosition(currentPosition);
  };

  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition || !ctx) return;

    const position = getPosition(e.clientX, e.clientY);
    if (!position) return;

    // Usar la herramienta actual para finalizar el dibujo
    currentToolRef.current.endDrawing(ctx, position);

    setIsDrawing(false);
    setLastPosition(null);

    // Capturar estado después de completar una acción
    captureState();
  };

  // Manejadores de eventos para dispositivos táctiles
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir scroll en dispositivos móviles

    const touch = e.touches[0];
    const position = getPosition(touch.clientX, touch.clientY);
    if (!position || !ctx) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo
    currentToolRef.current.startDrawing(ctx, position);
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir scroll en dispositivos móviles

    if (!isDrawing || !lastPosition || !ctx) return;

    const touch = e.touches[0];
    const currentPosition = getPosition(touch.clientX, touch.clientY);
    if (!currentPosition) return;

    // Usar la herramienta actual para continuar el dibujo
    currentToolRef.current.continueDrawing(ctx, lastPosition, currentPosition);
    setLastPosition(currentPosition);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir comportamientos no deseados

    if (!isDrawing || !lastPosition || !ctx) return;

    // Para eventos touch, usamos la última posición conocida como posición final
    // ya que no hay información de posición en touchend
    currentToolRef.current.endDrawing(ctx, lastPosition);

    setIsDrawing(false);
    setLastPosition(null);

    // Capturar estado después de completar una acción
    captureState();
  };

  return (
    <div className={`canvas-container ${className}`}>
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        color={color}
        setColor={setColor}
        lineWidth={lineWidth}
        setLineWidth={setLineWidth}
        opacity={opacity}
        setOpacity={setOpacity}
        onClear={clearCanvas}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoStackSize={undoStackSize}
        redoStackSize={redoStackSize}
      />

      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          display: "block",
          touchAction: "none", // Importante para prevenir gestos táctiles por defecto
          backgroundColor: "#fff",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div className="canvas-info text-xs text-gray-500 mt-2">
        <p>
          Herramienta: {activeTool} | Color: {color} | Grosor: {lineWidth}px |
          Opacidad: {Math.round(opacity * 100)}%
        </p>
        {isDrawing && lastPosition && (
          <p>
            Dibujando en: x={Math.round(lastPosition.x)}, y=
            {Math.round(lastPosition.y)}
          </p>
        )}
      </div>
    </div>
  );
};

export default Canvas;
