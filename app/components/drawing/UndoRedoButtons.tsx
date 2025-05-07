"use client";

import React from "react";

export interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoStackSize?: number;
  redoStackSize?: number;
  isVertical?: boolean;
}

/**
 * Componente que muestra botones para las acciones de deshacer y rehacer
 */
const UndoRedoButtons = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoStackSize = 0,
  redoStackSize = 0,
  isVertical = false,
}: UndoRedoButtonsProps) => {
  return (
    <div className={`undo-redo-controls flex ${isVertical ? 'flex-col w-full gap-2' : 'flex-row gap-1'}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${
          canUndo
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        } py-2 px-3 rounded transition-colors duration-200 flex items-center gap-1 ${isVertical ? 'w-full justify-center' : ''}`}
        title={`Deshacer (Ctrl+Z) - ${undoStackSize} acciones guardadas`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6" />
          <path d="M3 13c0-4.4 3.6-8 8-8h6" />
        </svg>
        <span className={isVertical ? 'inline' : 'hidden sm:inline'}>Deshacer</span>
        {undoStackSize > 0 && <span className="text-xs opacity-75">({undoStackSize})</span>}
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${
          canRedo
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        } py-2 px-3 rounded transition-colors duration-200 flex items-center gap-1 ${isVertical ? 'w-full justify-center' : ''}`}
        title={`Rehacer (Ctrl+Y) - ${redoStackSize} acciones para rehacer`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M21 13c0-4.4-3.6-8-8-8H7" />
        </svg>
        <span className={isVertical ? 'inline' : 'hidden sm:inline'}>Rehacer</span>
        {redoStackSize > 0 && <span className="text-xs opacity-75">({redoStackSize})</span>}
      </button>
    </div>
  );
};

export default UndoRedoButtons; 