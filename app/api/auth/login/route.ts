import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Hacer una petición al backend para autenticar
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Authentication failed' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    
    // Para un entorno de desarrollo, simular la respuesta
    if (process.env.NODE_ENV === 'development') {
      console.log('Devolviendo respuesta simulada de login');
      return NextResponse.json({
        user: {
          userId: '12345',
          username: 'usuario_demo',
          email: 'usuario@ejemplo.com',
          role: 'user',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInVzZXJuYW1lIjoidXN1YXJpb19kZW1vIiwiaWF0IjoxNjE2MTU5MDIyfQ.mock_token_for_development',
        refreshToken: 'refresh_mock_token',
        message: 'Login successful (DEV MODE)',
      });
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 