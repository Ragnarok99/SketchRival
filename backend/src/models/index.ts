// Exportar todos los modelos y sus interfaces
export * from './User.model';
export * from './GameRoom.model';
export * from './GamePlayer.model';
export * from './GameMessage.model';
export * from './GameState.model';

// Exportaciones de modelos directamente para simplificar importaciones
import { UserModel } from './User.model';
import { GameRoomModel } from './GameRoom.model';
import { GamePlayerModel } from './GamePlayer.model';
import { GameMessageModel } from './GameMessage.model';
import { GameStateModel } from './GameState.model';

export { UserModel, GameRoomModel, GamePlayerModel, GameMessageModel, GameStateModel };
