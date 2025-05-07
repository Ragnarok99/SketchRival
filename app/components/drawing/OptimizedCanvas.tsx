"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MouseEvent, TouchEvent } from "react";
import Toolbar from "./Toolbar";
import { DrawingToolType, LayerContexts, Point, RenderQuality } from "./tools/DrawingTool";
import { ToolFactory } from "./tools/ToolFactory";
import { HistoryManager } from "./HistoryManager";
import CanvasLayers, { LayerRefs } from "./CanvasLayers";
import { 
  throttle, 
  debounce, 
  AnimationLoop, 
  PerformanceMonitor 
} from "./utils/performanceUtils";

interface OptimizedCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  maxHistorySize?: number;
}

/**
 * Componente de Canvas optimizado con sistema de capas y técnicas de optimización de rendimiento
 */
const OptimizedCanvas = ({
  width = 800,
  height = 600,
  className = "",
  maxHistorySize = 30,
}: OptimizedCanvasProps) => {
  // Referencias
  const layersRef = useRef<LayerRefs>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point | null>(null);
  
  // Monitor de rendimiento y calidad adaptativa
  const performanceMonitorRef = useRef(new PerformanceMonitor());
  const [renderQuality, setRenderQuality] = useState<RenderQuality>({
    level: 'high',
    optimizationFactor: 1
  });
  
  // Bucle de animación para dibujo optimizado
  const animationLoopRef = useRef<AnimationLoop | null>(null);
  
  // Estados para las propiedades de la herramienta
  const [activeTool, setActiveTool] = useState<DrawingToolType>("pencil");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [opacity, setOpacity] = useState(1);

  // Referencia a la herramienta activa y contextos de capas
  const currentToolRef = useRef(
    ToolFactory.createTool(activeTool, { color, lineWidth, opacity }),
  );
  const layerContextsRef = useRef<LayerContexts | null>(null);

  // Estados y referencias para el gestor de historial
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager(maxHistorySize));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoStackSize, setUndoStackSize] = useState(0);
  const [redoStackSize, setRedoStackSize] = useState(0);

  // Detectar estadísticas de rendimiento
  const performanceStatsRef = useRef({
    fps: 0,
    renderTime: 0,
  });
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);

  // Actualizar estados del historial (con debounce para mejorar rendimiento)
  const updateHistoryStates = useCallback(
    debounce(() => {
      const historyManager = historyManagerRef.current;
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
      setUndoStackSize(historyManager.getUndoStackSize());
      setRedoStackSize(historyManager.getRedoStackSize());
    }, 300),
    []
  );

  // Inicializar/actualizar los contextos de capas
  const updateLayerContexts = useCallback(() => {
    if (!layersRef.current) return;

    layerContextsRef.current = {
      backgroundCtx: layersRef.current.getBackgroundContext(),
      mainCtx: layersRef.current.getMainContext(),
      previewCtx: layersRef.current.getPreviewContext(),
      clearLayer: layersRef.current.clear,
    };

    // Inicializar la herramienta actual con los contextos
    if (currentToolRef.current.initialize && layerContextsRef.current) {
      currentToolRef.current.initialize(layerContextsRef.current);
    }
  }, []);

  // Actualizar la herramienta activa cuando cambien las propiedades
  useEffect(() => {
    // Limpiar la herramienta anterior si es necesario
    if (currentToolRef.current.cleanup) {
      currentToolRef.current.cleanup();
    }

    // Crear nueva herramienta
    currentToolRef.current = ToolFactory.createTool(activeTool, {
      color,
      lineWidth,
      opacity,
    });

    // Inicializarla con los contextos si están disponibles
    if (currentToolRef.current.initialize && layerContextsRef.current) {
      currentToolRef.current.initialize(layerContextsRef.current);
    }

    // Actualizar calidad de renderizado en la herramienta
    if (currentToolRef.current.updateRenderQuality) {
      currentToolRef.current.updateRenderQuality(renderQuality);
    }
  }, [activeTool, color, lineWidth, opacity, renderQuality]);

  // Configurar monitor de calidad adaptativa
  useEffect(() => {
    performanceMonitorRef.current.setAdaptiveQualityCallback((level) => {
      console.log(`Adjusting render quality to: ${level}`);
      
      // Actualizar calidad según rendimiento
      const optimizationFactor = level === 'high' ? 1 : level === 'medium' ? 0.6 : 0.3;
      const newQuality = {
        level,
        optimizationFactor,
      };
      
      setRenderQuality(newQuality);
      
      // Actualizar calidad en la herramienta actual
      if (currentToolRef.current.updateRenderQuality) {
        currentToolRef.current.updateRenderQuality(newQuality);
      }
    });
  }, []);

  // Inicializar el bucle de animación
  useEffect(() => {
    if (!isInitialized) return;

    // Bucle de renderizado para métricas de rendimiento
    const renderCallback = (deltaTime: number) => {
      performanceMonitorRef.current.logFrameTime(deltaTime);
      
      // Actualizar estadísticas de rendimiento cada segundo
      performanceStatsRef.current = {
        fps: Math.round(performanceMonitorRef.current.getCurrentFPS()),
        renderTime: Math.round(performanceMonitorRef.current.getAverageFrameTime())
      };
    };

    // Crear bucle de animación
    animationLoopRef.current = new AnimationLoop(renderCallback);
    animationLoopRef.current.start();

    return () => {
      if (animationLoopRef.current) {
        animationLoopRef.current.stop();
      }
    };
  }, [isInitialized]);

  // Inicializar y establecer el canvas cuando el componente se monta
  useEffect(() => {
    if (!layersRef.current) return;
    updateLayerContexts();
    setIsInitialized(true);

    // Capturar el estado inicial para historial
    const captureInitialState = debounce(() => {
      if (layersRef.current?.mainCanvas) {
        historyManagerRef.current.captureState(layersRef.current.mainCanvas);
        updateHistoryStates();
      }
    }, 300);

    captureInitialState();
  }, [updateLayerContexts, updateHistoryStates]);

  // Función para capturar el estado después de una acción (debounced para mejor rendimiento)
  const captureState = useCallback(
    debounce(() => {
      if (!layersRef.current?.mainCanvas) return;
      historyManagerRef.current.captureState(layersRef.current.mainCanvas);
      updateHistoryStates();
    }, 300),
    [updateHistoryStates]
  );

  // Método para limpiar el canvas
  const clearCanvas = useCallback(() => {
    if (!layersRef.current) return;
    
    // Capturar el estado antes de limpiar
    captureState();
    
    // Limpiar todas las capas
    layersRef.current.clear("all");
    
    // Reiniciar fondo blanco en la capa de fondo
    const bgCtx = layersRef.current.getBackgroundContext();
    if (bgCtx) {
      bgCtx.fillStyle = "#ffffff";
      bgCtx.fillRect(0, 0, width, height);
    }
    
    // Capturar el estado después de limpiar
    captureState();
  }, [width, height, captureState]);

  // Funciones para deshacer y rehacer
  const handleUndo = useCallback(() => {
    if (!layersRef.current?.mainCanvas || !layerContextsRef.current) return;
    
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      const image = new Image();
      image.onload = () => {
        // Limpiar las capas
        if (layersRef.current) {
          layersRef.current.clear("main");
        }
        
        // Dibujar la imagen restaurada en la capa principal
        const mainCtx = layerContextsRef.current?.mainCtx;
        if (mainCtx) {
          mainCtx.drawImage(image, 0, 0, width, height);
        }
        
        updateHistoryStates();
      };
      image.src = previousState;
    }
  }, [width, height, updateHistoryStates]);

  const handleRedo = useCallback(() => {
    if (!layersRef.current?.mainCanvas || !layerContextsRef.current) return;
    
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      const image = new Image();
      image.onload = () => {
        // Limpiar las capas
        if (layersRef.current) {
          layersRef.current.clear("main");
        }
        
        // Dibujar la imagen restaurada en la capa principal
        const mainCtx = layerContextsRef.current?.mainCtx;
        if (mainCtx) {
          mainCtx.drawImage(image, 0, 0, width, height);
        }
        
        updateHistoryStates();
      };
      image.src = nextState;
    }
  }, [width, height, updateHistoryStates]);

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
      // P para mostrar/ocultar estadísticas de rendimiento
      else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowPerformanceStats(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Obtener posición relativa del mouse o toque (throttled para mejorar rendimiento)
  const getPosition = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const previewCanvas = layersRef.current?.previewCanvas;
      if (!previewCanvas) return null;

      const rect = previewCanvas.getBoundingClientRect();
      // Calcular posición relativa considerando el factor de escala
      const scaleX = previewCanvas.width / (rect.width * window.devicePixelRatio || 1);
      const scaleY = previewCanvas.height / (rect.height * window.devicePixelRatio || 1);

      return {
        x: ((clientX - rect.left) * scaleX) / window.devicePixelRatio,
        y: ((clientY - rect.top) * scaleY) / window.devicePixelRatio,
      };
    },
    []
  );

  // Crear versiones throttled separadas
  const throttledGetPosition = useCallback(
    throttle((clientX: number, clientY: number) => getPosition(clientX, clientY), 5),
    [getPosition]
  );

  // Manejadores de eventos para mouse (throttled para mejorar rendimiento)
  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const position = getPosition(e.clientX, e.clientY);
    if (!position || !layerContextsRef.current) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo
    currentToolRef.current.startDrawing(
      layerContextsRef.current, 
      position,
      renderQuality
    );
  }, [getPosition, captureState, renderQuality]);

  const throttledMouseMove = useCallback(
    throttle((e: MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !lastPosition || !layerContextsRef.current) return;

      const currentPosition = getPosition(e.clientX, e.clientY);
      if (!currentPosition) return;

      // Usar la herramienta actual para continuar el dibujo
      currentToolRef.current.continueDrawing(
        layerContextsRef.current,
        lastPosition,
        currentPosition,
        renderQuality
      );
      
      setLastPosition(currentPosition);
    }, 8),
    [isDrawing, lastPosition, getPosition, renderQuality]
  );

  const handleMouseUp = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition || !layerContextsRef.current) return;

    const position = getPosition(e.clientX, e.clientY);
    if (!position) return;

    // Usar la herramienta actual para finalizar el dibujo
    currentToolRef.current.endDrawing(
      layerContextsRef.current,
      position,
      renderQuality
    );

    setIsDrawing(false);
    setLastPosition(null);

    // Capturar estado después de completar una acción
    captureState();
  }, [isDrawing, lastPosition, getPosition, captureState, renderQuality]);

  // Manejadores de eventos para dispositivos táctiles
  const handleTouchStart = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir scroll en dispositivos móviles

    const touch = e.touches[0];
    const position = getPosition(touch.clientX, touch.clientY);
    if (!position || !layerContextsRef.current) return;

    // Capturar estado antes de comenzar una acción
    captureState();

    setIsDrawing(true);
    setLastPosition(position);

    // Usar la herramienta actual para iniciar el dibujo
    currentToolRef.current.startDrawing(
      layerContextsRef.current,
      position,
      renderQuality
    );
  }, [getPosition, captureState, renderQuality]);

  const throttledTouchMove = useCallback(
    throttle((e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault(); // Prevenir scroll en dispositivos móviles

      if (!isDrawing || !lastPosition || !layerContextsRef.current) return;

      const touch = e.touches[0];
      const currentPosition = getPosition(touch.clientX, touch.clientY);
      if (!currentPosition) return;

      // Usar la herramienta actual para continuar el dibujo
      currentToolRef.current.continueDrawing(
        layerContextsRef.current,
        lastPosition,
        currentPosition,
        renderQuality
      );
      
      setLastPosition(currentPosition);
    }, 8),
    [isDrawing, lastPosition, getPosition, renderQuality]
  );

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir comportamientos no deseados

    if (!isDrawing || !lastPosition || !layerContextsRef.current) return;

    // Para eventos touch, usamos la última posición conocida como posición final
    // ya que no hay información de posición en touchend
    currentToolRef.current.endDrawing(
      layerContextsRef.current,
      lastPosition,
      renderQuality
    );

    setIsDrawing(false);
    setLastPosition(null);

    // Capturar estado después de completar una acción
    captureState();
  }, [isDrawing, lastPosition, captureState, renderQuality]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    throttledMouseMove(e);
  }, [throttledMouseMove]);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    throttledTouchMove(e);
  }, [throttledTouchMove]);

  return (
    <div className={`optimized-canvas-container ${className}`}>
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

      <CanvasLayers
        ref={layersRef}
        width={width}
        height={height}
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
          {showPerformanceStats && (
            <span className="ml-4 font-mono">
              FPS: {performanceStatsRef.current.fps} | 
              Render: {performanceStatsRef.current.renderTime.toFixed(1)}ms | 
              Calidad: {renderQuality.level}
            </span>
          )}
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

export default OptimizedCanvas; 