'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPrivateRoomForm() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Función para normalizar el código (mayúsculas, sin espacios)
  const normalizeCode = (code: string) => {
    return code.toUpperCase().replace(/\s/g, '');
  };

  // Validar formato de código (6 caracteres alfanuméricos)
  const isValidCode = (code: string) => {
    return /^[A-Z0-9]{6}$/.test(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalizar y validar el código
    const normalizedCode = normalizeCode(accessCode);
    
    if (!isValidCode(normalizedCode)) {
      setError('El código debe tener 6 caracteres alfanuméricos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar la sala con ese código
      const response = await fetch(`/api/private/access/${normalizedCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al buscar la sala');
      }

      const data = await response.json();
      
      // Redirigir a la página de sala
      router.push(`/gameRoom/${data.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar la sala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="accessCode" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Código de acceso
          </label>
          <input
            id="accessCode"
            type="text"
            placeholder="Ingresa el código de 6 caracteres"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value);
              if (error) setError(null);
            }}
            maxLength={6}
            autoComplete="off"
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || accessCode.length === 0}
          className={`w-full py-2 px-4 rounded-lg ${
            loading || accessCode.length === 0
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              Buscando...
            </span>
          ) : (
            'Unirse a sala'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          El código de acceso es proporcionado por el anfitrión de la sala privada.
        </p>
      </div>
    </div>
  );
} 