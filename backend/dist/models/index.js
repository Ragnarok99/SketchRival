"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRewardModel = exports.GameRewardModel = exports.GameWordBankModel = exports.GameStatsModel = exports.GameStateModel = exports.GameMessageModel = exports.GamePlayerModel = exports.GameRoomModel = exports.UserModel = void 0;
// Exportar todos los modelos y sus interfaces
__exportStar(require("./User.model"), exports);
__exportStar(require("./GameRoom.model"), exports);
__exportStar(require("./GamePlayer.model"), exports);
__exportStar(require("./GameMessage.model"), exports);
__exportStar(require("./GameState.model"), exports);
__exportStar(require("./GameStats.model"), exports);
__exportStar(require("./GameWordBank.model"), exports);
__exportStar(require("./GameReward.model"), exports);
// Exportaciones de modelos directamente para simplificar importaciones
const User_model_1 = require("./User.model");
Object.defineProperty(exports, "UserModel", { enumerable: true, get: function () { return User_model_1.UserModel; } });
const GameRoom_model_1 = require("./GameRoom.model");
Object.defineProperty(exports, "GameRoomModel", { enumerable: true, get: function () { return GameRoom_model_1.GameRoomModel; } });
const GamePlayer_model_1 = require("./GamePlayer.model");
Object.defineProperty(exports, "GamePlayerModel", { enumerable: true, get: function () { return GamePlayer_model_1.GamePlayerModel; } });
const GameMessage_model_1 = require("./GameMessage.model");
Object.defineProperty(exports, "GameMessageModel", { enumerable: true, get: function () { return GameMessage_model_1.GameMessageModel; } });
const GameState_model_1 = require("./GameState.model");
Object.defineProperty(exports, "GameStateModel", { enumerable: true, get: function () { return GameState_model_1.GameStateModel; } });
const GameStats_model_1 = require("./GameStats.model");
Object.defineProperty(exports, "GameStatsModel", { enumerable: true, get: function () { return GameStats_model_1.GameStatsModel; } });
const GameWordBank_model_1 = require("./GameWordBank.model");
Object.defineProperty(exports, "GameWordBankModel", { enumerable: true, get: function () { return GameWordBank_model_1.GameWordBankModel; } });
const GameReward_model_1 = require("./GameReward.model");
Object.defineProperty(exports, "GameRewardModel", { enumerable: true, get: function () { return GameReward_model_1.GameRewardModel; } });
Object.defineProperty(exports, "UserRewardModel", { enumerable: true, get: function () { return GameReward_model_1.UserRewardModel; } });
