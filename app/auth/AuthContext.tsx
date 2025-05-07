'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definir la interfaz para el usuario autenticado
export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  role: string;
}

// Interfaz para el contexto de autenticación
interface AuthContextType {
  user: AuthenticatedUser | undefined;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comprobar autenticación existente al cargar
  useEffect(() => {
    // Simular carga de datos de usuario (en una implementación real, esto verificaría un token almacenado)
    setTimeout(() => {
      // Usuario mock de prueba
      const mockUser: AuthenticatedUser = {
        userId: '12345',
        username: 'usuario_demo',
        email: 'usuario@ejemplo.com',
        role: 'user',
      };
      
      setUser(mockUser);
      setLoading(false);
    }, 500);
  }, []);

  // Iniciar sesión
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular llamada a API (en implementación real, esto haría una petición al backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Usuario mock para pruebas
      setUser({
        userId: '12345',
        username: 'usuario_demo',
        email,
        role: 'user',
      });
      
      return true;
    } catch (err) {
      setError('Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const logout = () => {
    setUser(undefined);
  };

  // Registrar nuevo usuario
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular llamada a API (en implementación real, esto haría una petición al backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Crear usuario mock
      setUser({
        userId: '67890',
        username,
        email,
        role: 'user',
      });
      
      return true;
    } catch (err) {
      setError('Error al registrar usuario');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Valor del contexto
  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
} 