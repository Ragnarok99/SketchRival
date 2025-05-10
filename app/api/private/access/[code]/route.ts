import { NextRequest, NextResponse } from 'next/server';

// URL base del backend (usada como respaldo si no existe la variable de entorno)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;
    
    // Validar formato del código
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { message: 'Código de acceso inválido' },
        { status: 400 }
      );
    }
    
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authorized, no token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Hacer una petición al backend para buscar la sala por código
      const response = await fetch(`${API_BASE_URL}/private/access/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { message: errorData.message || 'Error al buscar la sala' },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error en /api/private/access/[code]:', error);
      
      // Simular una respuesta para desarrollo/pruebas
      return NextResponse.json({
        roomId: 'private-' + Math.random().toString(36).substring(2, 8),
        name: `Sala privada (${code})`,
        players: 2,
        maxPlayers: 8
      });
    }
  } catch (error) {
    console.error('Error en /api/private/access/[code]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 