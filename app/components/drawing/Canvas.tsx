"use client";

import { useRef, useEffect, useState, MouseEvent, TouchEvent, useCallback } from "react";
import Toolbar from "./Toolbar";
import { DrawingToolType, Point, LayerContexts } from "./tools/DrawingTool";
import { ToolFactory } from "./tools/ToolFactory";
import { HistoryManager } from "./HistoryManager";
import { ImageExporter, ImageFormat, ExportOptions } from "./utils/ImageExporter";

interface CanvasProps {
  width?: number;
  height?: number;
  className?: string;
  maxHistorySize?: number;
  responsive?: boolean;
  maxWidth?: number;
  preserveAspectRatio?: boolean;
}

const Canvas = ({ 
  width = 800, 
  height = 600, 
  className = "",
  maxHistorySize = 30,
  responsive = true,
  maxWidth = 1200,
  preserveAspectRatio = true,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point | null>(null);
  
  // Estados para dimensiones responsivas
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);

  // Estados para las propiedades de la herramienta
  const [activeTool, setActiveTool] = useState<DrawingToolType>("pencil");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [opacity, setOpacity] = useState(1);

  // Crear un objeto LayerContexts para compatibilidad con la interfaz moderna
  const layerContextsRef = useRef<LayerContexts>({
    backgroundCtx: null,
    mainCtx: null,
    previewCtx: null,
    clearLayer: (layer = "all") => {
      if (!ctx || !canvasRef.current) return;
      const width = canvasRef.current.width / (window.devicePixelRatio || 1);
      const height = canvasRef.current.height / (window.devicePixelRatio || 1);
      if (layer === "all" || layer === "main") {
        ctx.clearRect(0, 0, width, height);
      }
    }
  });

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

  // Referencia al exportador de imágenes
  const imageExporterRef = useRef<ImageExporter | null>(null);

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
    
    // Inicializar la herramienta con los contextos si está disponible
    if (currentToolRef.current.initialize && layerContextsRef.current) {
      currentToolRef.current.initialize(layerContextsRef.current);
    }
  }, [activeTool, color, lineWidth, opacity]);

  // Función para redimensionar el canvas
  const resizeCanvas = useCallback((newWidth: number, newHeight: number) => {
    if (newWidth === currentWidth && newHeight === currentHeight) return;
    
    console.log(`Canvas estándar redimensionado a ${newWidth}x${newHeight}`);
    
    // Actualizar dimensiones
    setCurrentWidth(newWidth);
    setCurrentHeight(newHeight);
    
    // Guardar el contenido actual
    const imageData = canvasRef.current?.toDataURL();
    
    // El useEffect se encargará de reconfigurar el canvas con las nuevas dimensiones
  }, [currentWidth, currentHeight]);

  // Manejo de redimensionamiento responsivo
  const handleResize = useCallback(() => {
    if (!responsive || !containerRef.current) return;
    
    // Obtener ancho disponible
    const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
    
    // Limitar al ancho máximo
    const targetWidth = Math.min(parentWidth - 32, maxWidth);
    
    // Calcular altura manteniendo relación de aspecto si se especifica
    let targetHeight = height;
    if (preserveAspectRatio) {
      const aspectRatio = width / height;
      targetHeight = targetWidth / aspectRatio;
    }
    
    // Redimensionar
    resizeCanvas(targetWidth, targetHeight);
  }, [responsive, width, height, maxWidth, preserveAspectRatio, resizeCanvas]);

  // Configurar observer de redimensionamiento
  useEffect(() => {
    if (!responsive) return;
    
    // Aplicar dimensiones responsivas iniciales
    handleResize();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [responsive, handleResize]);

  // Inicializar el canvas cuando el componente se monta o las dimensiones cambian
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
    canvas.width = currentWidth * dpr;
    canvas.height = currentHeight * dpr;

    // Escalar el contexto para mantener dimensiones visuales correctas
    context.scale(dpr, dpr);

    // Configuración inicial del lienzo
    canvas.style.width = `${currentWidth}px`;
    canvas.style.height = `${currentHeight}px`;

    // Establecer el fondo blanco por defecto
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, currentWidth, currentHeight);

    setCtx(context);
    
    // Actualizar los contextos en el objeto LayerContexts
    layerContextsRef.current = {
      backgroundCtx: null,
      mainCtx: context,  // En el Canvas estándar, el contexto principal es el único disponible
      previewCtx: null,
      clearLayer: (layer = "all") => {
        if (!context) return;
        if (layer === "all" || layer === "main") {
          context.clearRect(0, 0, currentWidth, currentHeight);
          
          // Restablecer el fondo blanco
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, currentWidth, currentHeight);
        }
      }
    };
    
    // Inicializar la herramienta con el contexto actualizado
    if (currentToolRef.current.initialize) {
      currentToolRef.current.initialize(layerContextsRef.current);
    }
    
    setIsInitialized(true);

    // Capturar el estado inicial
    if (canvas) {
      setTimeout(() => {
        historyManagerRef.current.captureState(canvas);
        updateHistoryStates();
      }, 100);
    }

    // Inicializar el exportador de imágenes
    imageExporterRef.current = new ImageExporter(layerContextsRef.current, currentWidth, currentHeight);

    // Limpiar cuando el componente se desmonte o las dimensiones cambien
    return () => {
      setCtx(null);
      setIsInitialized(false);
    };
  }, [currentWidth, currentHeight, updateHistoryStates]);

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
    ctx.fillRect(0, 0, currentWidth, currentHeight);
    
    // Capturar el estado después de limpiar
    captureState();
  }, [ctx, currentWidth, currentHeight, captureState]);

  // Funciones para deshacer y rehacer
  const handleUndo = useCallback(() => {
    if (!canvasRef.current || !ctx) return;
    
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, currentWidth, currentHeight);
        ctx.drawImage(image, 0, 0, currentWidth, currentHeight);
        updateHistoryStates();
      };
      image.src = previousState;
    }
  }, [ctx, currentWidth, currentHeight, updateHistoryStates]);

  const handleRedo = useCallback(() => {
    if (!canvasRef.current || !ctx) return;
    
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, currentWidth, currentHeight);
        ctx.drawImage(image, 0, 0, currentWidth, currentHeight);
        updateHistoryStates();
      };
      image.src = nextState;
    }
  }, [ctx, currentWidth, currentHeight, updateHistoryStates]);

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
    if (!position || !ctx || !layerContextsRef.current) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo con LayerContexts
    currentToolRef.current.startDrawing(layerContextsRef.current, position);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition || !ctx || !layerContextsRef.current) return;

    const currentPosition = getPosition(e.clientX, e.clientY);
    if (!currentPosition) return;

    // Usar la herramienta actual para continuar el dibujo con LayerContexts
    currentToolRef.current.continueDrawing(
      layerContextsRef.current, 
      lastPosition, 
      currentPosition
    );
    
    setLastPosition(currentPosition);
  };

  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition || !ctx || !layerContextsRef.current) return;

    const position = getPosition(e.clientX, e.clientY);
    if (!position) return;

    // Usar la herramienta actual para finalizar el dibujo con LayerContexts
    currentToolRef.current.endDrawing(layerContextsRef.current, position);

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
    if (!position || !ctx || !layerContextsRef.current) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo con LayerContexts
    currentToolRef.current.startDrawing(layerContextsRef.current, position);
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir scroll en dispositivos móviles

    if (!isDrawing || !lastPosition || !ctx || !layerContextsRef.current) return;

    const touch = e.touches[0];
    const currentPosition = getPosition(touch.clientX, touch.clientY);
    if (!currentPosition) return;

    // Usar la herramienta actual para continuar el dibujo con LayerContexts
    currentToolRef.current.continueDrawing(
      layerContextsRef.current, 
      lastPosition, 
      currentPosition
    );
    
    setLastPosition(currentPosition);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir comportamientos no deseados

    if (!isDrawing || !lastPosition || !ctx || !layerContextsRef.current) return;

    // Para eventos touch, usamos la última posición conocida como posición final
    // ya que no hay información de posición en touchend
    currentToolRef.current.endDrawing(layerContextsRef.current, lastPosition);

    setIsDrawing(false);
    setLastPosition(null);

    // Capturar estado después de completar una acción
    captureState();
  };

  // Manejar exportación de imagen
  const handleExport = useCallback((format: ImageFormat, options: ExportOptions) => {
    if (!imageExporterRef.current) return;
    imageExporterRef.current.exportImage(format, options);
  }, []);

  return (
    <div className={`canvas-container ${className}`} ref={containerRef}>
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
        onExport={handleExport}
        responsive={responsive}
      />
      
      <div 
        className="canvas-wrapper" 
        style={{ 
          width: `${currentWidth}px`, 
          height: `${currentHeight}px`,
          maxWidth: '100%',
          margin: '0 auto',
          position: 'relative'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="rounded-lg shadow-md"
          style={{ 
            touchAction: "none",
            cursor: "crosshair" 
          }}
        />
      </div>

      <div className="canvas-info text-xs text-gray-500 mt-2">
        <p>
          Herramienta: {activeTool} | Color: {color} | Grosor: {lineWidth}px |
          Opacidad: {Math.round(opacity * 100)}% | 
          Tamaño: {currentWidth}x{currentHeight}
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
