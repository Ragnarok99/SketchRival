'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/AuthContext'; // Suponiendo que hay un contexto de autenticación

// Definir tipos
type RoomType = 'public' | 'private';
type GameDifficulty = 'easy' | 'medium' | 'hard';

interface RoomConfig {
  maxPlayers: number;
  timeLimit?: number;
  categories: string[];
  difficulty: GameDifficulty;
}

interface FormData {
  name: string;
  type: RoomType;
  config: RoomConfig;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth(); // Suponiendo que hay un contexto de autenticación
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'public',
    config: {
      maxPlayers: 4,
      timeLimit: 30,
      categories: [],
      difficulty: 'medium',
    }
  });
  
  // Estado de carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);
  
  // Cargar categorías disponibles
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/configs');
        if (!response.ok) {
          throw new Error('Error al cargar configuraciones');
        }
        
        const data = await response.json();
        if (data.categories) {
          setAvailableCategories(data.categories);
        }
      } catch (err) {
        console.error('Error al cargar categorías:', err);
        // Categorías de respaldo en caso de error
        setAvailableCategories(['general', 'ciencia', 'deportes', 'entretenimiento', 'historia']);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Manejar cambios en los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('config.')) {
      const configField = name.split('.')[1];
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          [configField]: value,
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Limpiar mensajes de error
    if (error) setError(null);
  };
  
  // Manejar cambios en las categorías seleccionadas
  const handleCategoryChange = (category: string) => {
    const currentCategories = [...formData.config.categories];
    
    if (currentCategories.includes(category)) {
      // Quitar categoría
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          categories: currentCategories.filter(cat => cat !== category),
        }
      });
    } else {
      // Añadir categoría
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          categories: [...currentCategories, category],
        }
      });
    }
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre de la sala es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          configuration: {
            maxPlayers: parseInt(formData.config.maxPlayers.toString()),
            timeLimit: formData.config.timeLimit ? parseInt(formData.config.timeLimit.toString()) : undefined,
            categories: formData.config.categories,
            difficulty: formData.config.difficulty,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la sala');
      }
      
      const data = await response.json();
      
      // Redirigir a la sala creada
      router.push(`/gameRoom/${data.room._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la sala');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirigiendo al login...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center">
          <button 
            onClick={() => router.push('/gameRoom')}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            &larr; Volver
          </button>
          <h1 className="text-3xl font-bold">Crear Nueva Sala</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Sala *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa un nombre para tu sala"
              maxLength={50}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Sala
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="public"
                  checked={formData.type === 'public'}
                  onChange={handleChange}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">Pública</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="private"
                  checked={formData.type === 'private'}
                  onChange={handleChange}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">Privada (con código de acceso)</span>
              </label>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Configuración de la Sala</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="config.maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo de Jugadores
                </label>
                <select
                  id="config.maxPlayers"
                  name="config.maxPlayers"
                  value={formData.config.maxPlayers}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map(num => (
                    <option key={num} value={num}>{num} jugadores</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="config.timeLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo Límite (minutos)
                </label>
                <select
                  id="config.timeLimit"
                  name="config.timeLimit"
                  value={formData.config.timeLimit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin límite</option>
                  {[5, 10, 15, 20, 30, 45, 60].map(num => (
                    <option key={num} value={num}>{num} minutos</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dificultad
              </label>
              <div className="flex flex-wrap gap-4">
                {(['easy', 'medium', 'hard'] as GameDifficulty[]).map(difficulty => (
                  <label key={difficulty} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="config.difficulty"
                      value={difficulty}
                      checked={formData.config.difficulty === difficulty}
                      onChange={handleChange}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2 capitalize">{difficulty}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorías
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableCategories.map(category => (
                  <label key={category} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.config.categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="form-checkbox text-blue-600"
                    />
                    <span className="ml-2 capitalize">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t mt-8">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                loading
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></span>
                  Creando Sala...
                </span>
              ) : (
                'Crear Sala'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 