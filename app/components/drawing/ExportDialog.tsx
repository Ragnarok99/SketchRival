"use client";

import React, { useState, useRef, useEffect } from "react";
import { ImageFormat, ExportOptions } from "./utils/ImageExporter";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ImageFormat, options: ExportOptions) => void;
  initialFormat?: ImageFormat;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  initialFormat = "png"
}) => {
  const [format, setFormat] = useState<ImageFormat>(initialFormat);
  const [quality, setQuality] = useState<number>(0.92);
  const [scale, setScale] = useState<number>(1);
  const [filename, setFilename] = useState<string>(`dibujo-${new Date().toISOString().slice(0, 10)}`);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Cerrar el diálogo al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Manejar la tecla Escape para cerrar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleExport = () => {
    const options: ExportOptions = {
      quality,
      scale,
      filename
    };

    onExport(format, options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full"
      >
        <h2 className="text-xl font-bold mb-4">Exportar Imagen</h2>

        {/* Formato */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Formato</label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setFormat("png")}
              className={`px-4 py-2 rounded ${
                format === "png" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => setFormat("jpeg")}
              className={`px-4 py-2 rounded ${
                format === "jpeg" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              JPEG
            </button>
            <button
              type="button"
              onClick={() => setFormat("svg")}
              className={`px-4 py-2 rounded ${
                format === "svg" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              SVG
            </button>
          </div>
        </div>

        {/* Calidad (solo JPEG) */}
        {format === "jpeg" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Calidad: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Escala */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Escala: {scale}x
          </label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Nombre de archivo */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Nombre de archivo</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Información adicional */}
        <div className="text-xs text-gray-500 mb-4">
          {format === "png" && "PNG: Mejor calidad con transparencia. Recomendado para ilustraciones."}
          {format === "jpeg" && "JPEG: Archivo más pequeño. Mejor para fotografías y compartir en redes."}
          {format === "svg" && "SVG: Formato vectorial. Ideal para gráficos que requieren escalado."}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog; 