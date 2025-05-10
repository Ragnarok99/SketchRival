'use client';

import Link from 'next/link';
import { useAuth } from '../../auth/AuthContext'; // Ajustar ruta si es necesario
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirigir a la home después del logout
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            SketchRival
          </Link>
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div> {/* Placeholder para estado de carga */}
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
          SketchRival
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/leaderboards" className="text-gray-600 hover:text-indigo-600 transition-colors">
            Leaderboards
          </Link>
          {/* Podríamos añadir más enlaces aquí: Cómo Jugar, etc. */}

          {user ? (
            <div className="relative group">
              <button className="flex items-center text-gray-600 hover:text-indigo-600">
                <span className="mr-1">{user.username || 'Usuario'}</span> 
                {/* Icono de dropdown o avatar simple */}
                <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </button>
              <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-xl z-20 hidden group-hover:block">
                {/* <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-500 hover:text-white">
                  Mi Perfil
                </Link> */}
                {/* TODO: Enlazar a la página de perfil cuando esté creada (Tarea 10) */}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-500 hover:text-white"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-x-2">
              <Link href="/auth/login" className="px-4 py-2 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-50 transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/auth/register" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors">
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 