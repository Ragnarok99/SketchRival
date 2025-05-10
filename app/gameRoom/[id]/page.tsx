import GameRoomClient from './GameRoomClient';

interface GameRoomPageProps {
  params: {
    id: string;
  };
}

export default async function GameRoomPage({ params }: GameRoomPageProps) {
  // Extraer el ID desde los parámetros en el lado del servidor
  const { id } = params;
  
  // Renderizar el componente cliente con el ID como prop
  return <GameRoomClient roomId={id} />;
} 