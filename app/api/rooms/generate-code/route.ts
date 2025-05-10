import { NextRequest, NextResponse } from 'next/server';

// Generar un código alfanumérico aleatorio de 6 caracteres
function generateRandomCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evitamos caracteres confusos como 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authorized, no token' },
        { status: 401 }
      );
    }
    
    // Si estuviéramos conectando con el backend, aquí podríamos llamar a un endpoint
    // para generar un código único verificado contra la base de datos
    // Por ahora, simplemente generamos uno aleatorio
    
    const accessCode = generateRandomCode();
    
    return NextResponse.json({ accessCode });
  } catch (error) {
    console.error('Error in /api/rooms/generate-code:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 