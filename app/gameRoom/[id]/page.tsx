import React from 'react';
import GameRoomClient from './GameRoomClient';

interface GameRoomPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  // Desenvolver los parámetros utilizando React.use() como recomienda Next.js
  const resolvedParams = React.use(params);
  
  return <GameRoomClient roomId={resolvedParams.id} />;
} 