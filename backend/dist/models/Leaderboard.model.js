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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardEntryModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LeaderboardEntrySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
        default: 0,
    },
    level: {
        type: Number,
    },
    rank: {
        type: Number, // Podría ser calculado dinámicamente y no almacenado
    },
    lastGamePlayedAt: {
        type: Date,
        default: Date.now,
    },
    category: {
        type: String,
        default: 'global', // Por defecto, la tabla de líderes es global
        index: true,
    },
}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Índice compuesto para consultas eficientes de leaderboards
LeaderboardEntrySchema.index({ category: 1, score: -1, lastGamePlayedAt: -1 });
LeaderboardEntrySchema.index({ category: 1, userId: 1 }, { unique: true }); // Un jugador por categoría
// Modelo para las entradas del Leaderboard
exports.LeaderboardEntryModel = mongoose_1.default.model('LeaderboardEntry', LeaderboardEntrySchema);
exports.default = exports.LeaderboardEntryModel;
