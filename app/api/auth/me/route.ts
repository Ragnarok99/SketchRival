import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Hacer una petición al backend para verificar y obtener la información del usuario
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { message: errorData.message || 'Unauthorized' },
          { status: response.status }
        );
      }
      
      const userData = await response.json();
      
      return NextResponse.json(userData);
    } catch (fetchError) {
      console.error('Error fetching user data:', fetchError);
      
      // Para un entorno de desarrollo, simular la respuesta
      if (process.env.NODE_ENV === 'development') {
        console.log('Devolviendo respuesta simulada de /me');
        return NextResponse.json({
          userId: '12345',
          username: 'usuario_demo',
          email: 'usuario@ejemplo.com',
          role: 'user',
        });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 