"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from "react";

export interface LayerRefs {
  backgroundCanvas: HTMLCanvasElement | null;
  mainCanvas: HTMLCanvasElement | null;
  previewCanvas: HTMLCanvasElement | null;
  getBackgroundContext: () => CanvasRenderingContext2D | null;
  getMainContext: () => CanvasRenderingContext2D | null;
  getPreviewContext: () => CanvasRenderingContext2D | null;
  clear: (layer?: "background" | "main" | "preview" | "all") => void;
  resize: (width: number, height: number) => void;
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
  responsive?: boolean;
  maxWidth?: number;
  preserveAspectRatio?: boolean;
  onResize?: (width: number, height: number) => void;
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
      responsive = true,
      maxWidth = 1200,
      preserveAspectRatio = true,
      onResize
    },
    ref
  ) => {
    // Referencias a los canvas
    const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // Contenedor para el sistema de capas
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Estados para dimensiones responsivas
    const [responsiveWidth, setResponsiveWidth] = useState(width);
    const [responsiveHeight, setResponsiveHeight] = useState(height);
    
    // Estado para la orientación del dispositivo
    const [isLandscape, setIsLandscape] = useState(false);
    
    // Estado para zoom y pan en dispositivos móviles
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    
    // Flag para depuración
    const debugEvents = false;

    // Referencias a los contextos
    const backgroundCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Determinar si es un dispositivo móvil
    const isMobileDevice = useCallback(() => {
      return window.innerWidth < 768 || 
             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);

    // Configurar el contexto para un canvas con alta densidad de píxeles
    const setupCanvas = useCallback(
      (
        canvas: HTMLCanvasElement,
        setContext: (ctx: CanvasRenderingContext2D) => void,
        w: number = responsiveWidth,
        h: number = responsiveHeight
      ) => {
        // Establecer resolución correcta para pantallas de alta densidad de píxeles
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;

        // Configurar tamaño visual
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        // Obtener y configurar el contexto
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (context) {
          // Escalar el contexto para mantener dimensiones visuales correctas
          context.scale(dpr, dpr);
          setContext(context);
        }
      },
      [responsiveWidth, responsiveHeight]
    );

    // Función para redimensionar el canvas preservando el contenido
    const resizeCanvas = useCallback((newWidth: number, newHeight: number) => {
      if (newWidth === responsiveWidth && newHeight === responsiveHeight) return;
      
      // Asegurar un tamaño mínimo para canvas en dispositivos pequeños
      const minWidth = isMobileDevice() ? 280 : 320;
      const minHeight = isMobileDevice() ? 210 : 240;
      
      const finalWidth = Math.max(newWidth, minWidth);
      const finalHeight = Math.max(newHeight, minHeight);
      
      // Guardar el contenido actual de cada capa antes de redimensionar
      const backgroundData = backgroundCanvasRef.current?.toDataURL();
      const mainData = mainCanvasRef.current?.toDataURL();
      
      // Actualizar dimensiones responsivas
      setResponsiveWidth(finalWidth);
      setResponsiveHeight(finalHeight);
      
      // Notificar al componente padre sobre el cambio de tamaño
      if (onResize) onResize(finalWidth, finalHeight);
      
      // Aplicar nuevas dimensiones (el setupCanvas se ejecutará en el siguiente efecto)
      
      // Restaurar el contenido después de redimensionar
      if (backgroundData && backgroundCtxRef.current) {
        const img = new Image();
        img.onload = () => {
          if (backgroundCtxRef.current) {
            backgroundCtxRef.current.drawImage(img, 0, 0, finalWidth, finalHeight);
          }
        };
        img.src = backgroundData;
      }
      
      if (mainData && mainCtxRef.current) {
        const img = new Image();
        img.onload = () => {
          if (mainCtxRef.current) {
            mainCtxRef.current.drawImage(img, 0, 0, finalWidth, finalHeight);
          }
        };
        img.src = mainData;
      }
    }, [responsiveWidth, responsiveHeight, onResize, isMobileDevice]);

    // Inicializar los canvas cuando el componente se monta o las dimensiones cambian
    useEffect(() => {
      if (backgroundCanvasRef.current) {
        setupCanvas(backgroundCanvasRef.current, (ctx) => {
          backgroundCtxRef.current = ctx;
          // Establecer fondo blanco por defecto
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, responsiveWidth, responsiveHeight);
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
    }, [responsiveWidth, responsiveHeight, setupCanvas]);

    // Detectar orientación del dispositivo
    const detectOrientation = useCallback(() => {
      // Detectar orientación basado en relación de aspecto en lugar de window.orientation
      // que está deprecado en algunos navegadores
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      setIsLandscape(isLandscapeMode);
      
      console.log(`Orientación cambiada: ${isLandscapeMode ? 'landscape' : 'portrait'}`);
      
      return isLandscapeMode;
    }, []);

    // Función para manejar el redimensionamiento responsivo
    const handleResize = useCallback(() => {
      if (!responsive || !containerRef.current) return;
      
      // Detectar orientación actual
      const isLandscapeMode = detectOrientation();
      
      // Obtener ancho disponible (el contenedor padre o ventana)
      const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      
      // Ajustar padding basado en el tamaño de pantalla
      const paddingSize = isMobileDevice() ? 16 : 32; 
      
      // Limitar al ancho máximo configurado
      const targetWidth = Math.min(parentWidth - paddingSize, maxWidth);
      
      // Calcular altura manteniendo relación de aspecto si se especifica
      let targetHeight = height;
      if (preserveAspectRatio) {
        // En móviles pequeños en modo portrait, usar una relación de aspecto diferente
        // para que no sea demasiado alto
        if (isMobileDevice() && !isLandscapeMode && window.innerWidth < 480) {
          // Usar relación de aspecto 4:3 para dispositivos pequeños en portrait
          const mobileAspectRatio = 4/3;
          targetHeight = targetWidth / mobileAspectRatio;
        } else {
          const aspectRatio = width / height;
          targetHeight = targetWidth / aspectRatio;
        }
      }
      
      // Redimensionar el canvas
      resizeCanvas(targetWidth, targetHeight);
    }, [responsive, width, height, maxWidth, preserveAspectRatio, resizeCanvas, detectOrientation, isMobileDevice]);

    // Configurar observer de redimensionamiento y cambio de orientación
    useEffect(() => {
      if (!responsive) return;
      
      // Aplicar dimensiones responsivas iniciales
      handleResize();
      
      // Crear ResizeObserver para detectar cambios en el contenedor padre
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      
      // Observar el contenedor si existe
      if (containerRef.current && containerRef.current.parentElement) {
        resizeObserver.observe(containerRef.current.parentElement);
      }
      
      // Escuchar cambios de orientación en dispositivos móviles
      window.addEventListener('orientationchange', handleResize);
      // Respaldo para navegadores que no soportan orientationchange
      window.addEventListener('resize', handleResize);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('orientationchange', handleResize);
        window.removeEventListener('resize', handleResize);
      };
    }, [responsive, handleResize]);

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
          backgroundCtxRef.current.fillRect(0, 0, responsiveWidth, responsiveHeight);
        }
      }

      if (
        targetLayer === "main" ||
        targetLayer === "all"
      ) {
        if (mainCtxRef.current) {
          mainCtxRef.current.clearRect(0, 0, responsiveWidth, responsiveHeight);
        }
      }

      if (
        targetLayer === "preview" ||
        targetLayer === "all"
      ) {
        if (previewCtxRef.current) {
          previewCtxRef.current.clearRect(0, 0, responsiveWidth, responsiveHeight);
        }
      }
    };
    
    // Manejadores de eventos con loggeo para depuración
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (debugEvents) console.log("CanvasLayers - MouseDown", e.clientX, e.clientY);
      if (onMouseDown) onMouseDown(e);
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (debugEvents) console.log("CanvasLayers - MouseMove", e.clientX, e.clientY);
      if (onMouseMove) onMouseMove(e);
    };
    
    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (debugEvents) console.log("CanvasLayers - MouseUp", e.clientX, e.clientY);
      if (onMouseUp) onMouseUp(e);
    };
    
    const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (debugEvents) console.log("CanvasLayers - MouseLeave");
      if (onMouseLeave) onMouseLeave(e);
    };
    
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (debugEvents && e.touches[0]) console.log("CanvasLayers - TouchStart", e.touches[0].clientX, e.touches[0].clientY);
      if (onTouchStart) onTouchStart(e);
    };
    
    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (debugEvents && e.touches[0]) console.log("CanvasLayers - TouchMove", e.touches[0].clientX, e.touches[0].clientY);
      if (onTouchMove) onTouchMove(e);
    };
    
    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (debugEvents) console.log("CanvasLayers - TouchEnd");
      if (onTouchEnd) onTouchEnd(e);
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
      resize: resizeCanvas,
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
        ref={containerRef}
        className={`canvas-layers-container relative ${className}`}
        style={{ 
          width: `${responsiveWidth}px`, 
          height: `${responsiveHeight}px`,
          maxWidth: '100%',
          margin: '0 auto'
        }}
      >
        {isMobileDevice() && (
          <div 
            className="canvas-orientation-hint absolute -top-6 left-0 right-0 text-center text-xs text-gray-500"
            style={{ display: isLandscape ? 'none' : 'block' }}
          >
            ↔️ Gira tu dispositivo para una mejor experiencia
          </div>
        )}
        
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    );
  }
);

CanvasLayers.displayName = "CanvasLayers";

export default CanvasLayers; 