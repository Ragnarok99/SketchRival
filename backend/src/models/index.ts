// Exportar todos los modelos y sus interfaces
export * from './User.model';
export * from './GameRoom.model';
export * from './GamePlayer.model';
export * from './GameMessage.model';
export * from './GameState.model';
export * from './GameStats.model';
export * from './GameWordBank.model';
export * from './GameReward.model';

// Exportaciones de modelos directamente para simplificar importaciones
import { UserModel } from './User.model';
import { GameRoomModel } from './GameRoom.model';
import { GamePlayerModel } from './GamePlayer.model';
import { GameMessageModel } from './GameMessage.model';
import { GameStateModel } from './GameState.model';
import { GameStatsModel } from './GameStats.model';
import { GameWordBankModel } from './GameWordBank.model';
import { GameRewardModel, UserRewardModel } from './GameReward.model';

export {
  UserModel,
  GameRoomModel,
  GamePlayerModel,
  GameMessageModel,
  GameStateModel,
  GameStatsModel,
  GameWordBankModel,
  GameRewardModel,
  UserRewardModel,
};
