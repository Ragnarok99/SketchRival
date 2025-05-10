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
  getAuthToken: () => string | null;
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
    const checkAuth = async () => {
      try {
        // Intentar recuperar el token del localStorage
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          console.log('No token found in localStorage');
          setLoading(false);
          return;
        }
        
        console.log('Token found, verifying with backend...');
        
        // Verificar el token con el backend
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User verified:', userData);
          setUser(userData);
        } else {
          console.warn('Token verification failed. Status:', response.status);
          // Token no válido o expirado, limpiamos localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } catch (err) {
        console.error('Error al verificar autenticación:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Obtener token de autenticación
  const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Iniciar sesión
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { email });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Login failed:', data);
        throw new Error(data.message || 'Credenciales inválidas');
      }
      
      console.log('Login successful, tokens received');
      
      // Guardar tokens en localStorage
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Almacenar información del usuario
      setUser(data.user);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const logout = () => {
    // Eliminar tokens del localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(undefined);
    console.log('User logged out');
  };

  // Registrar nuevo usuario
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting registration with:', { username, email });
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Registration failed:', data);
        throw new Error(data.message || 'Error al registrar el usuario');
      }
      
      console.log('Registration successful, tokens received');
      
      // Opcionalmente iniciar sesión automáticamente
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      setUser(data.user);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar usuario';
      console.error('Registration error:', errorMessage);
      setError(errorMessage);
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
    getAuthToken,
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