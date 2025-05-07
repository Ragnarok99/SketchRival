"use client";

import React, { useState, useEffect } from "react";
import { DrawingToolType } from "./tools/DrawingTool";
import UndoRedoButtons from "./UndoRedoButtons";

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
}: ToolbarProps) => {
  // Estado para mostrar información contextual de la herramienta activa
  const [showToolInfo, setShowToolInfo] = useState(true);
  
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
    };

    // Añadir listener global
    window.addEventListener('keydown', handleKeyDown);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tools, setActiveTool]);

  return (
    <div className="drawing-toolbar p-4 bg-white rounded-lg shadow-md mb-4 transition-all duration-200">
      {/* Sección superior: herramientas y acciones */}
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
        {/* Panel de herramientas de dibujo */}
        <div className="tools-panel bg-gray-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Herramientas</h3>
          <div className="tools-container flex flex-wrap gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className={`tool-button flex flex-col items-center justify-center p-2 rounded transition-all duration-200 ${
                  activeTool === tool.id
                    ? "bg-blue-500 text-white scale-110 shadow-md"
                    : "bg-white hover:bg-gray-100 text-gray-700 hover:scale-105"
                }`}
                onClick={() => setActiveTool(tool.id)}
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
        
        {/* Panel de acciones (deshacer/rehacer y limpiar) */}
        <div className="actions-panel bg-gray-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Acciones</h3>
          <div className="flex items-center gap-4">
            <UndoRedoButtons
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              undoStackSize={undoStackSize}
              redoStackSize={redoStackSize}
            />
            
            <button
              onClick={onClear}
              className="ml-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors duration-200 flex items-center gap-1"
              title="Limpiar canvas (doble clic para confirmar)"
              onDoubleClick={onClear}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              Limpiar
            </button>
          </div>
        </div>
      </div>
      
      {/* Información contextual de la herramienta activa */}
      {activeToolInfo && showToolInfo && (
        <div className="tool-info bg-blue-50 p-3 rounded-lg mb-4 transition-all duration-300 border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-blue-800">
                {activeToolInfo.name}
                <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  Atajo: {activeToolInfo.shortcut}
                </span>
              </h3>
              <p className="text-sm text-blue-700 mt-1">{activeToolInfo.description}</p>
            </div>
            <button 
              onClick={() => setShowToolInfo(false)} 
              className="text-blue-500 hover:text-blue-700"
              aria-label="Cerrar información"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Panel de configuración de herramientas */}
      <div className="settings-container bg-gray-50 p-3 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Selector de color (solo visible para herramientas que no son borradores) */}
          {showColorControls && (
            <div className="color-picker">
              <label
                htmlFor="color"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-full cursor-pointer border border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-500">{color}</span>
              </div>
            </div>
          )}

          {/* Control de grosor */}
          <div className="line-width">
            <label
              htmlFor="lineWidth"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {activeTool.startsWith("eraser") ? "Tamaño del borrador" : "Grosor"}
            </label>
            <div className="flex items-center">
              <input
                type="range"
                id="lineWidth"
                min="1"
                max={activeTool === "eraser-area" ? "200" : "50"}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <span className="ml-2 text-sm text-gray-500 w-12 text-center">
                {lineWidth}px
              </span>
            </div>
          </div>

          {/* Control de opacidad (solo visible para herramientas que no son borradores) */}
          {showColorControls && (
            <div className="opacity">
              <label
                htmlFor="opacity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Opacidad
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  id="opacity"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="ml-2 text-sm text-gray-500 w-12 text-center">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mensajes específicos para herramientas especiales */}
      {activeTool.startsWith("eraser") && (
        <div className="eraser-info mt-3 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            {activeTool === "eraser-precision" 
              ? "Borrador de precisión: Arrastra para borrar con precisión." 
              : "Borrador de área: Haz clic y arrastra para seleccionar el área a borrar."}
          </p>
        </div>
      )}

      {/* Atajos de teclado globales */}
      <div className="keyboard-shortcuts mt-3 text-xs text-gray-500">
        <p>Atajos globales: <span className="font-medium">Ctrl+Z</span> (Deshacer), <span className="font-medium">Ctrl+Y</span> (Rehacer), <span className="font-medium">Ctrl+P</span> (Estadísticas)</p>
        <p>Herramientas: {tools.map(t => (
          <span key={t.shortcut} className="ml-1">
            <span className="font-medium">{t.shortcut}</span> ({t.name})
          </span>
        ))}
        </p>
      </div>
    </div>
  );
};

export default Toolbar;
