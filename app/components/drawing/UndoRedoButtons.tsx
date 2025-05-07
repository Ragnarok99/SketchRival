"use client";

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoStackSize?: number;
  redoStackSize?: number;
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
}: UndoRedoButtonsProps) => {
  return (
    <div className="undo-redo-buttons flex items-center space-x-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`flex items-center justify-center p-2 rounded ${
          canUndo
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        title="Deshacer (Ctrl+Z)"
        aria-label="Deshacer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h11a4 4 0 0 1 0 8h-1" />
        </svg>
        {undoStackSize > 0 && (
          <span className="ml-1 text-xs">{undoStackSize}</span>
        )}
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`flex items-center justify-center p-2 rounded ${
          canRedo
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        title="Rehacer (Ctrl+Y)"
        aria-label="Rehacer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 14l5-5-5-5" />
          <path d="M20 9H9a4 4 0 0 0 0 8h1" />
        </svg>
        {redoStackSize > 0 && (
          <span className="ml-1 text-xs">{redoStackSize}</span>
        )}
      </button>
    </div>
  );
};

export default UndoRedoButtons; 