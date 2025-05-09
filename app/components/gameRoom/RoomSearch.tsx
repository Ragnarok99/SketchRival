'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoomSearchProps {
  onSearch?: (query: string) => void;
}

export default function RoomSearch({ onSearch }: RoomSearchProps) {
  const [searchType, setSearchType] = useState<'name' | 'code'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSearchResult, setCodeSearchResult] = useState<any | null>(null);
  
  const router = useRouter();

  // Normalizar código de acceso (quitar espacios, convertir a mayúsculas)
  const normalizeCode = (code: string) => {
    return code.toUpperCase().replace(/\s/g, '');
  };

  // Validar formato de código (6 caracteres alfanuméricos)
  const isValidCode = (code: string) => {
    return /^[A-Z0-9]{6}$/.test(code);
  };

  // Manejar cambio de texto en la búsqueda
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setError(null);
    setCodeSearchResult(null);
    
    // Si estamos buscando por nombre y hay una función onSearch, llamarla
    if (searchType === 'name' && onSearch) {
      onSearch(e.target.value);
    }
  };

  // Manejar la búsqueda por código
  const handleCodeSearch = async () => {
    // Limpiar estados previos
    setError(null);
    setCodeSearchResult(null);
    
    // Normalizar y validar el código
    const normalizedCode = normalizeCode(searchQuery);
    
    if (!isValidCode(normalizedCode)) {
      setError('El código debe tener 6 caracteres alfanuméricos');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/rooms/code/${normalizedCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'No se encontró ninguna sala con ese código');
      }

      const data = await response.json();
      setCodeSearchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar la sala');
    } finally {
      setLoading(false);
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchType === 'code') {
      handleCodeSearch();
    }
  };

  // Manejar clic para unirse a la sala encontrada
  const handleJoinFoundRoom = () => {
    if (codeSearchResult && codeSearchResult.roomId) {
      router.push(`/gameRoom/${codeSearchResult.roomId}`);
    }
  };

  // Limpiar la búsqueda
  const handleClear = () => {
    setSearchQuery('');
    setError(null);
    setCodeSearchResult(null);
    if (onSearch) onSearch('');
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex space-x-4 mb-2">
          <button
            type="button"
            onClick={() => {
              setSearchType('name');
              setError(null);
              setCodeSearchResult(null);
              if (onSearch) onSearch(searchQuery);
            }}
            className={`px-3 py-1 rounded-lg text-sm ${
              searchType === 'name' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Buscar por Nombre
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchType('code');
              setError(null);
              if (onSearch) onSearch('');
            }}
            className={`px-3 py-1 rounded-lg text-sm ${
              searchType === 'code' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Buscar por Código
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex w-full">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder={searchType === 'name' ? "Buscar salas por nombre..." : "Ingresa código de sala (6 caracteres)"}
              value={searchQuery}
              onChange={handleQueryChange}
              className="w-full px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={searchType === 'code' ? 6 : undefined}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={handleClear}
              >
                ✕
              </button>
            )}
          </div>
          
          {searchType === 'code' && (
            <button
              type="submit"
              disabled={loading || searchQuery.length === 0}
              className={`px-4 py-2 rounded-r-lg ${
                loading || searchQuery.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center w-6 h-5">
                  <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                </span>
              ) : (
                'Buscar'
              )}
            </button>
          )}
        </form>
        
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      
      {codeSearchResult && codeSearchResult.found && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg text-green-800">
                ¡Sala encontrada!
              </h3>
              <p className="text-green-700 mb-1">
                {codeSearchResult.roomName}
              </p>
              <p className="text-sm text-green-600">
                Jugadores: {codeSearchResult.playersCount}/{codeSearchResult.maxPlayers}
              </p>
            </div>
            <button
              onClick={handleJoinFoundRoom}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Unirse
            </button>
          </div>
        </div>
      )}
      
      {codeSearchResult && !codeSearchResult.found && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-700">
            No se encontró ninguna sala con el código proporcionado.
          </p>
        </div>
      )}
    </div>
  );
} 