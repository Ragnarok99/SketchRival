"use client";

import React, { useState, useEffect } from "react";
import { DrawingToolType } from "./tools/DrawingTool";
import UndoRedoButtons from "./UndoRedoButtons";
import ExportDialog from "./ExportDialog";
import { ImageFormat, ExportOptions } from "./utils/ImageExporter";

// Interfaz para las propiedades del componente Toolbar
interface ToolbarProps {
  activeTool: DrawingToolType;
  setActiveTool: (tool: DrawingToolType) => void;
  color: string;
  setColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  onClear: () => void;
  // Propiedades para deshacer/rehacer
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoStackSize?: number;
  redoStackSize?: number;
  // Propiedades para exportación
  onExport?: (format: ImageFormat, options: ExportOptions) => void;
  // Propiedades para adaptación responsiva
  responsive?: boolean;
}

// Interfaz para información de herramientas
interface ToolInfo {
  id: DrawingToolType;
  name: string;
  shortcut: string;
  description: string;
  icon: React.ReactNode;
}

const Toolbar = ({
  activeTool,
  setActiveTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  opacity,
  setOpacity,
  onClear,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoStackSize = 0,
  redoStackSize = 0,
  onExport,
  responsive,
}: ToolbarProps) => {
  // Estado para mostrar información contextual de la herramienta activa
  const [showToolInfo, setShowToolInfo] = useState(true);
  // Estado para mostrar el diálogo de exportación
  const [showExportDialog, setShowExportDialog] = useState(false);
  // Estado para mostrar menú colapsado en dispositivos móviles
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // Estado para controlar qué sección está expandida en vista móvil
  const [expandedSection, setExpandedSection] = useState<'tools' | 'actions' | 'settings' | null>(null);
  // Estado para detectar ancho de pantalla
  const [isMobileView, setIsMobileView] = useState(false);
  // Estado para detectar orientación
  const [isPortrait, setIsPortrait] = useState(false);
  
  // Detectar tamaño de pantalla y orientación para adaptación responsiva
  useEffect(() => {
    if (!responsive) return;
    
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobileView(width < 768);
      setIsPortrait(height > width);
      
      // En pantallas muy pequeñas en portrait, expandir automáticamente las herramientas
      if (width < 480 && height > width) {
        setExpandedSection('tools');
      }
    };
    
    // Comprobar tamaño inicial
    checkScreenSize();
    
    // Escuchar cambios de tamaño y orientación
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, [responsive]);
  
  // Lista de herramientas disponibles con información extendida
  const tools: ToolInfo[] = [
    { 
      id: "pencil", 
      name: "Lápiz", 
      shortcut: "P",
      description: "Dibuja trazos precisos de líneas finas. Ideal para detalles y contornos.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      )
    },
    { 
      id: "brush", 
      name: "Pincel", 
      shortcut: "B",
      description: "Crea trazos suaves con grosor variable. Perfecto para colorear áreas grandes.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          <path d="M4 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          <path d="M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8"/>
          <path d="M12 4v8"/>
        </svg>
      )
    },
    { 
      id: "line", 
      name: "Línea", 
      shortcut: "L",
      description: "Dibuja líneas rectas entre dos puntos. Mantén Shift para líneas a 45°.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19L19 5"/>
        </svg>
      )
    },
    { 
      id: "rectangle", 
      name: "Rectángulo", 
      shortcut: "R",
      description: "Crea rectángulos con bordes personalizables. Mantén Shift para un cuadrado perfecto.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      )
    },
    { 
      id: "circle", 
      name: "Círculo", 
      shortcut: "C",
      description: "Dibuja círculos perfectos con tamaño ajustable. Arrastra desde el centro hacia afuera.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )
    },
    { 
      id: "eraser-precision", 
      name: "Borrador", 
      shortcut: "E",
      description: "Borra con precisión siguiendo el movimiento del cursor. Ajusta el tamaño según necesites.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H9L4 15l7-7 11 11-2 1z"/>
        </svg>
      )
    },
    { 
      id: "eraser-area", 
      name: "Borrar área", 
      shortcut: "A",
      description: "Selecciona y borra áreas completas. Ideal para limpiar regiones grandes del dibujo.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18v18H3z"/>
          <path d="M19 5L5 19"/>
          <path d="M19 12h-7"/>
          <path d="M12 5v7"/>
        </svg>
      )
    },
  ];

  // Encontrar la información de la herramienta activa
  const activeToolInfo = tools.find(tool => tool.id === activeTool);
  
  // Determinar si mostrar controles de color (no para borradores)
  const showColorControls = !activeTool.startsWith("eraser");

  // Manejar atajos de teclado para selección de herramientas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si se están usando teclas modificadoras (para permitir otros atajos)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      
      // Ignorar si el foco está en un input
      if (e.target instanceof HTMLInputElement) return;
      
      // Convertir a mayúsculas para consistencia
      const key = e.key.toUpperCase();
      
      // Buscar herramienta con ese atajo
      const tool = tools.find(t => t.shortcut === key);
      if (tool) {
        setActiveTool(tool.id);
        // Prevenir comportamiento por defecto (ej. escribir en inputs)
        e.preventDefault();
      }
      
      // Atajo para exportar (tecla 'S')
      if (key === 'S' && onExport) {
        setShowExportDialog(true);
        e.preventDefault();
      }
    };

    // Añadir listener global
    window.addEventListener('keydown', handleKeyDown);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tools, setActiveTool, onExport, setShowExportDialog]);

  // Alternar la sección expandida en vista móvil
  const toggleSection = (section: 'tools' | 'actions' | 'settings') => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Determinar la orientación de la barra de herramientas en móviles
  const getToolbarLayout = () => {
    // En pantallas muy pequeñas en portrait, mostrar en vertical
    if (isMobileView && isPortrait && window.innerWidth < 480) {
      return 'vertical';
    }
    // En otros casos, horizontal
    return 'horizontal';
  };
  
  const isVerticalLayout = getToolbarLayout() === 'vertical';

  return (
    <div className={`drawing-toolbar p-2 md:p-4 bg-white rounded-lg shadow-md mb-4 transition-all duration-200 ${isVerticalLayout ? 'floating-toolbar' : ''}`}>
      {/* Botón de menú móvil (visible solo en pantallas pequeñas) */}
      {isMobileView && (
        <div className="mobile-menu-toggle mb-2">
          <button 
            className="flex items-center justify-between w-full bg-gray-50 p-2 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <span className="font-medium">Menú de dibujo {showMobileMenu ? '(cerrar)' : '(abrir)'}</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`transition-transform ${showMobileMenu ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      )}

      {/* Contenido del toolbar (colapsable en móvil) */}
      <div className={`toolbar-content ${isMobileView && !showMobileMenu ? 'hidden' : 'block'}`}>
        {/* Sección superior: herramientas y acciones - adaptable a diferentes tamaños */}
        <div className={`${isVerticalLayout ? 'flex flex-col' : 'flex flex-col lg:flex-row'} justify-between mb-4 gap-4`}>
          {/* Panel de herramientas de dibujo - colapsable en móvil */}
          <div className="tools-panel bg-gray-50 p-3 rounded-lg">
            {isMobileView ? (
              <button 
                className="flex items-center justify-between w-full mb-2"
                onClick={() => toggleSection('tools')}
              >
                <h3 className="text-sm font-medium text-gray-700">Herramientas</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={`transition-transform ${expandedSection === 'tools' ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ) : (
              <h3 className="text-sm font-medium text-gray-700 mb-2">Herramientas</h3>
            )}
            
            <div className={`tools-container flex flex-wrap gap-2 ${isMobileView && expandedSection !== 'tools' ? 'hidden' : 'block'}`}>
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  className={`tool-button flex flex-col items-center justify-center p-2 rounded transition-all duration-200 ${
                    activeTool === tool.id
                      ? "bg-blue-500 text-white scale-110 shadow-md"
                      : "bg-white hover:bg-gray-100 text-gray-700 hover:scale-105"
                  } ${isVerticalLayout ? 'w-full flex-row justify-start gap-2' : ''}`}
                  onClick={() => {
                    setActiveTool(tool.id);
                    // En móvil, colapsar la sección de herramientas después de seleccionar una
                    if (isMobileView && isPortrait && window.innerWidth < 480) {
                      setExpandedSection(null);
                    }
                  }}
                  title={`${tool.name} (${tool.shortcut})`}
                  aria-label={tool.name}
                >
                  <div className="tool-icon w-6 h-6 flex items-center justify-center">
                    {tool.icon}
                  </div>
                  <span className="tool-name text-xs mt-1">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Panel de acciones (deshacer/rehacer y limpiar) - colapsable en móvil */}
          <div className="actions-panel bg-gray-50 p-3 rounded-lg">
            {isMobileView ? (
              <button 
                className="flex items-center justify-between w-full mb-2"
                onClick={() => toggleSection('actions')}
              >
                <h3 className="text-sm font-medium text-gray-700">Acciones</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={`transition-transform ${expandedSection === 'actions' ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ) : (
              <h3 className="text-sm font-medium text-gray-700 mb-2">Acciones</h3>
            )}
            
            <div className={`flex flex-wrap items-center gap-2 ${isMobileView && expandedSection !== 'actions' ? 'hidden' : 'flex'} ${isVerticalLayout ? 'flex-col w-full' : ''}`}>
              <UndoRedoButtons
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                undoStackSize={undoStackSize}
                redoStackSize={redoStackSize}
                isVertical={isVerticalLayout}
              />
              
              <button
                onClick={onClear}
                className={`bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded transition-colors duration-200 flex items-center gap-1 ${isVerticalLayout ? 'w-full justify-center' : ''}`}
                title="Limpiar canvas (doble clic para confirmar)"
                onDoubleClick={onClear}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                <span className={isVerticalLayout ? 'inline' : 'hidden sm:inline'}>Limpiar</span>
              </button>

              {/* Botón de exportar (visible solo si se proporciona la función onExport) */}
              {onExport && (
                <button
                  onClick={() => setShowExportDialog(true)}
                  className={`bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded transition-colors duration-200 flex items-center gap-1 ${isVerticalLayout ? 'w-full justify-center' : ''}`}
                  title="Exportar imagen (S)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span className={isVerticalLayout ? 'inline' : 'hidden sm:inline'}>Exportar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sección de configuración (colores, tamaño, opacidad) */}
        <div className="settings-panel bg-gray-50 p-3 rounded-lg">
          {isMobileView ? (
            <button 
              className="flex items-center justify-between w-full mb-2"
              onClick={() => toggleSection('settings')}
            >
              <h3 className="text-sm font-medium text-gray-700">Configuración</h3>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`transition-transform ${expandedSection === 'settings' ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          ) : (
            <h3 className="text-sm font-medium text-gray-700 mb-2">Configuración</h3>
          )}
          
          <div className={`settings-controls grid ${isVerticalLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4 ${isMobileView && expandedSection !== 'settings' ? 'hidden' : 'grid'}`}>
            {/* Control de color - visible solo cuando no es un borrador */}
            {showColorControls && (
              <div className="color-control">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-8 cursor-pointer rounded border border-gray-300"
                  />
                  <span className="text-sm text-gray-500">{color}</span>
                </div>
              </div>
            )}

            {/* Control de grosor */}
            <div className="line-width-control">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grosor: {lineWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Control de opacidad - visible solo cuando no es un borrador */}
            {showColorControls && (
              <div className="opacity-control">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opacidad: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Información de la herramienta activa - oculta en modo vertical para ahorrar espacio */}
        {showToolInfo && activeToolInfo && !isVerticalLayout && (
          <div className="tool-info bg-blue-50 p-3 rounded-lg mt-4 flex items-start">
            <div className="tool-icon bg-white p-2 rounded-full mr-3">
              {activeToolInfo.icon}
            </div>
            <div>
              <h4 className="font-medium text-blue-800">
                {activeToolInfo.name} 
                <span className="text-xs ml-2 text-blue-600">
                  (Atajo: {activeToolInfo.shortcut})
                </span>
              </h4>
              <p className="text-sm text-blue-700">{activeToolInfo.description}</p>
            </div>
            <button 
              className="ml-auto text-blue-500 hover:text-blue-700"
              onClick={() => setShowToolInfo(false)}
              aria-label="Cerrar información de herramienta"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        {/* Botón flotante de herramienta activa (solo en modo vertical) */}
        {isVerticalLayout && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white rounded-full shadow-lg p-3 z-50">
            <div className="tool-icon w-7 h-7 flex items-center justify-center">
              {activeToolInfo?.icon}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de exportación */}
      {showExportDialog && onExport && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={(format, options) => {
            onExport(format, options);
            setShowExportDialog(false);
          }}
        />
      )}
      
      {/* Estilos para toolbar vertical y flotante en móviles pequeños */}
      {isVerticalLayout && (
        <style jsx global>{`
          .floating-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            border-radius: 0 0 8px 8px;
          }
          
          .canvas-layers-container {
            margin-top: 65px !important;
          }
        `}</style>
      )}
    </div>
  );
};

export default Toolbar;
