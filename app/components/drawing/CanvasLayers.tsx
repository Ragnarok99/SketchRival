"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

export interface LayerRefs {
  backgroundCanvas: HTMLCanvasElement | null;
  mainCanvas: HTMLCanvasElement | null;
  previewCanvas: HTMLCanvasElement | null;
  getBackgroundContext: () => CanvasRenderingContext2D | null;
  getMainContext: () => CanvasRenderingContext2D | null;
  getPreviewContext: () => CanvasRenderingContext2D | null;
  clear: (layer?: "background" | "main" | "preview" | "all") => void;
}

interface CanvasLayersProps {
  width?: number;
  height?: number;
  className?: string;
  onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseUp?: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLCanvasElement>;
  onTouchStart?: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchMove?: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLCanvasElement>;
}

/**
 * Componente que gestiona un sistema de capas para el canvas
 * Proporciona tres capas: fondo (estático), principal (dibujo permanente) y previsualización (operaciones en curso)
 */
const CanvasLayers = forwardRef<LayerRefs, CanvasLayersProps>(
  (
    {
      width = 800,
      height = 600,
      className = "",
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    ref
  ) => {
    // Referencias a los canvas
    const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Referencias a los contextos
    const backgroundCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Configurar el contexto para un canvas con alta densidad de píxeles
    const setupCanvas = (
      canvas: HTMLCanvasElement,
      setContext: (ctx: CanvasRenderingContext2D) => void
    ) => {
      // Establecer resolución correcta para pantallas de alta densidad de píxeles
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Configurar tamaño visual
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Obtener y configurar el contexto
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (context) {
        // Escalar el contexto para mantener dimensiones visuales correctas
        context.scale(dpr, dpr);
        setContext(context);
      }
    };

    // Inicializar los canvas cuando el componente se monta
    useEffect(() => {
      if (backgroundCanvasRef.current) {
        setupCanvas(backgroundCanvasRef.current, (ctx) => {
          backgroundCtxRef.current = ctx;
          // Establecer fondo blanco por defecto
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        });
      }

      if (mainCanvasRef.current) {
        setupCanvas(mainCanvasRef.current, (ctx) => {
          mainCtxRef.current = ctx;
          // Configuración principal para dibujo
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        });
      }

      if (previewCanvasRef.current) {
        setupCanvas(previewCanvasRef.current, (ctx) => {
          previewCtxRef.current = ctx;
          // Configuraciones para capa de previsualización
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        });
      }
    }, [width, height]);

    // Función para limpiar una capa específica o todas
    const clearLayer = (layer?: "background" | "main" | "preview" | "all") => {
      // Si no se especifica capa, limpiar todas
      const targetLayer = layer || "all";

      if (
        targetLayer === "background" ||
        targetLayer === "all" 
      ) {
        if (backgroundCtxRef.current) {
          backgroundCtxRef.current.fillStyle = "#ffffff";
          backgroundCtxRef.current.fillRect(0, 0, width, height);
        }
      }

      if (
        targetLayer === "main" ||
        targetLayer === "all"
      ) {
        if (mainCtxRef.current) {
          mainCtxRef.current.clearRect(0, 0, width, height);
        }
      }

      if (
        targetLayer === "preview" ||
        targetLayer === "all"
      ) {
        if (previewCtxRef.current) {
          previewCtxRef.current.clearRect(0, 0, width, height);
        }
      }
    };

    // Exponer referencias y métodos a través de useImperativeHandle
    useImperativeHandle(ref, () => ({
      backgroundCanvas: backgroundCanvasRef.current,
      mainCanvas: mainCanvasRef.current,
      previewCanvas: previewCanvasRef.current,
      getBackgroundContext: () => backgroundCtxRef.current,
      getMainContext: () => mainCtxRef.current,
      getPreviewContext: () => previewCtxRef.current,
      clear: clearLayer,
    }));

    // Estilos comunes para los canvas
    const canvasStyle: React.CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      touchAction: "none", // Importante para prevenir gestos táctiles por defecto
    };

    return (
      <div
        className={`canvas-layers-container relative ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Canvas de fondo (estático) */}
        <canvas
          ref={backgroundCanvasRef}
          style={{
            ...canvasStyle,
            zIndex: 1,
            backgroundColor: "#fff",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        />

        {/* Canvas principal (dibujo permanente) */}
        <canvas
          ref={mainCanvasRef}
          style={{
            ...canvasStyle,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Canvas de previsualización (operaciones en curso) */}
        <canvas
          ref={previewCanvasRef}
          style={{
            ...canvasStyle,
            zIndex: 3,
            pointerEvents: "auto",
            cursor: "crosshair",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>
    );
  }
);

CanvasLayers.displayName = "CanvasLayers";

export default CanvasLayers; 