'use client';

import { useState, useEffect, useRef } from "react";
import Canvas from "../components/drawing/Canvas";
import OptimizedCanvas from "../components/drawing/OptimizedCanvas";
import { ToolFactory } from "../components/drawing/tools/ToolFactory";

export default function DrawingPage() {
  const [useOptimized, setUseOptimized] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detectar tamaño de pantalla para adaptación responsive
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowWidth(width);
      setWindowHeight(height);
      setIsMobileView(width < 768);
      setIsSmallScreen(width < 480);
      setIsPortrait(height > width);
      
      // Aplicar clase al body para manejar overscroll en dispositivos móviles
      if (width < 768) {
        document.body.classList.add('mobile-device');
      } else {
        document.body.classList.remove('mobile-device');
      }
    };
    
    // Comprobar tamaño inicial
    checkScreenSize();
    
    // Agregar evento de cambio de tamaño
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
      document.body.classList.remove('mobile-device');
    };
  }, []);

  // Configurar las herramientas optimizadas basado en el modo seleccionado
  useEffect(() => {
    // Usar herramientas optimizadas solo cuando el canvas optimizado está seleccionado
    ToolFactory.setUseOptimizedTools(useOptimized);
    
    console.log(`Modo de dibujo: ${useOptimized ? 'Optimizado' : 'Estándar'}`);
    console.log(`Usando herramientas optimizadas: ${useOptimized}`);
    
    // Limpiar al desmontar
    return () => {
      // Restaurar configuración por defecto
      ToolFactory.setUseOptimizedTools(true);
    };
  }, [useOptimized]);

  // Calcular tamaño de canvas basado en el contenedor y orientación del dispositivo
  const calculateCanvasSize = () => {
    if (!containerRef.current) return { width: 800, height: 600 };
    
    // Obtener el ancho disponible del contenedor
    const containerWidth = containerRef.current.clientWidth;
    
    // Calcular altura manteniendo relación de aspecto
    let containerHeight: number;
    
    // Aplicar diferentes relaciones de aspecto según dispositivo y orientación
    if (isMobileView) {
      if (isPortrait && isSmallScreen) {
        // Para pantallas pequeñas en modo portrait, usar relación 4:3
        containerHeight = Math.round(containerWidth * 0.75);
      } else if (isPortrait) {
        // Para pantallas medianas en modo portrait, usar relación 5:4
        containerHeight = Math.round(containerWidth * 0.8);
      } else {
        // Para modo landscape, mantener 16:9
        containerHeight = Math.round(containerWidth * 0.5625);
      }
      
      // Limitar altura en dispositivos móviles para evitar scroll
      const maxAvailableHeight = windowHeight - 250; // espacio para encabezado, toolbar y mensajes
      if (containerHeight > maxAvailableHeight) {
        containerHeight = maxAvailableHeight;
      }
    } else {
      // Escritorio: mantener relación 4:3
      containerHeight = Math.round(containerWidth * 0.75);
    }
    
    // Calcular dimensiones finales con limitaciones
    return {
      width: containerWidth,
      height: containerHeight,
      maxWidth: Math.min(1200, containerWidth),
    };
  };

  // Tamaño del canvas
  const canvasSize = calculateCanvasSize();

  return (
    <div className="container mx-auto py-4 md:py-8 px-3 md:px-4" ref={containerRef}>
      <h1 className={`text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6 ${isSmallScreen ? 'text-xl' : ''}`}>
        SketchRival - Canvas de Dibujo
      </h1>
      
      {!isSmallScreen && (
        <p className="text-center text-gray-600 mb-4 md:mb-6 text-sm md:text-base">
          Selecciona una herramienta y comienza a dibujar. Usa diferentes
          herramientas para crear tu obra maestra.
        </p>
      )}

      {/* Toggle entre canvas normal y optimizado */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors duration-200 ${
              !useOptimized
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-600 hover:bg-white/50"
            }`}
            onClick={() => setUseOptimized(false)}
          >
            Canvas Estándar
          </button>
          <button
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors duration-200 ${
              useOptimized
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-600 hover:bg-white/50"
            }`}
            onClick={() => setUseOptimized(true)}
          >
            Canvas Optimizado
          </button>
        </div>
      </div>

      {/* Indicador de modo */}
      <div className="text-center mb-4">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          useOptimized 
            ? "bg-green-100 text-green-800" 
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {isMobileView ? 
            (useOptimized ? "✨ Modo Optimizado" : "⚠️ Modo Estándar") :
            (useOptimized 
              ? "✨ Modo Optimizado: Todas las herramientas funcionan con rendimiento mejorado" 
              : "⚠️ Modo Estándar: Rendimiento básico")
          }
        </span>
      </div>
      
      {/* Instrucciones para modo optimizado - solo mostrar en pantallas mayores */}
      {useOptimized && !isSmallScreen && (
        <p className="text-center text-gray-500 text-xs md:text-sm mb-4 md:mb-6">
          Presiona <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+P</kbd> para ver estadísticas de rendimiento
        </p>
      )}

      {/* Renderizar el canvas adecuado */}
      <div className="flex justify-center">
        {useOptimized ? (
          <OptimizedCanvas 
            width={canvasSize.width} 
            height={canvasSize.height}
            maxWidth={canvasSize.maxWidth}
            responsive={true}
            preserveAspectRatio={true}
          />
        ) : (
          <Canvas 
            width={canvasSize.width} 
            height={canvasSize.height} 
          />
        )}
      </div>
      
      {/* Mensaje para dispositivos móviles */}
      {isMobileView && isPortrait && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg mt-4 text-sm">
          <p className="text-center">
            <strong>Consejo:</strong> Para mejor experiencia, gira tu dispositivo en modo horizontal.
          </p>
        </div>
      )}
      
      {/* Estilos para dispositivos móviles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-device {
            overscroll-behavior: none;
            overflow-x: hidden;
            touch-action: pan-x pan-y;
          }
          
          .canvas-orientation-hint {
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        }
      `}</style>
    </div>
  );
}

