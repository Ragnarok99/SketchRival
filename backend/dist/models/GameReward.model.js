"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRewardModel = exports.GameRewardModel = exports.RewardRarity = exports.RewardType = exports.RewardCategory = void 0;
const mongoose_1 = require("mongoose");
/**
 * Enumeración para las categorías de recompensas
 */
var RewardCategory;
(function (RewardCategory) {
    RewardCategory["GENERAL"] = "general";
    RewardCategory["DRAWING"] = "drawing";
    RewardCategory["GUESSING"] = "guessing";
    RewardCategory["SOCIAL"] = "social";
    RewardCategory["STREAK"] = "streak";
    RewardCategory["COLLECTION"] = "collection";
    RewardCategory["SKILL"] = "skill";
    RewardCategory["SPECIAL"] = "special";
})(RewardCategory || (exports.RewardCategory = RewardCategory = {}));
/**
 * Enumeración para los tipos de recompensas
 */
var RewardType;
(function (RewardType) {
    RewardType["ACHIEVEMENT"] = "achievement";
    RewardType["BADGE"] = "badge";
    RewardType["COSMETIC"] = "cosmetic";
    RewardType["TITLE"] = "title";
    RewardType["CURRENCY"] = "currency";
    RewardType["SPECIAL_ACCESS"] = "access";
})(RewardType || (exports.RewardType = RewardType = {}));
/**
 * Enumeración para el nivel de rareza
 */
var RewardRarity;
(function (RewardRarity) {
    RewardRarity["COMMON"] = "common";
    RewardRarity["UNCOMMON"] = "uncommon";
    RewardRarity["RARE"] = "rare";
    RewardRarity["EPIC"] = "epic";
    RewardRarity["LEGENDARY"] = "legendary";
})(RewardRarity || (exports.RewardRarity = RewardRarity = {}));
/**
 * Esquema para condiciones de desbloqueo
 */
const UnlockConditionSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
    },
    threshold: {
        type: Number,
        required: true,
    },
    comparison: {
        type: String,
        enum: ['gte', 'gt', 'lte', 'lt', 'eq'],
        default: 'gte',
    },
    description: {
        type: String,
        required: true,
    },
});
/**
 * Esquema principal para recompensas
 */
const GameRewardSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    displayName: {
        type: Map,
        of: String,
        required: true,
        validate: {
            validator: function (displayNames) {
                // Debe tener al menos un idioma
                return displayNames.size > 0;
            },
            message: 'Debe proporcionar al menos un nombre localizado',
        },
    },
    description: {
        type: Map,
        of: String,
        required: true,
        validate: {
            validator: function (descriptions) {
                // Debe tener al menos un idioma
                return descriptions.size > 0;
            },
            message: 'Debe proporcionar al menos una descripción localizada',
        },
    },
    category: {
        type: String,
        enum: Object.values(RewardCategory),
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(RewardType),
        required: true,
    },
    rarity: {
        type: String,
        enum: Object.values(RewardRarity),
        required: true,
        default: RewardRarity.COMMON,
    },
    iconUrl: {
        type: String,
    },
    unlockConditions: {
        type: [UnlockConditionSchema],
        required: true,
        validate: {
            validator: function (conditions) {
                // Debe tener al menos una condición
                return conditions.length > 0;
            },
            message: 'Debe proporcionar al menos una condición de desbloqueo',
        },
    },
    points: {
        type: Number,
        required: true,
        default: 10,
        min: 1,
    },
    isHidden: {
        type: Boolean,
        default: false,
    },
    isLimited: {
        type: Boolean,
        default: false,
    },
    availableFrom: {
        type: Date,
        validate: {
            validator: function (date) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return !this.isLimited || date instanceof Date;
            },
            message: 'Se requiere fecha de inicio para recompensas limitadas',
        },
    },
    availableUntil: {
        type: Date,
        validate: {
            validator: function (date) {
                // @ts-ignore: Accediendo a this en un contexto de Mongoose
                return !this.isLimited || date instanceof Date;
            },
            message: 'Se requiere fecha de fin para recompensas limitadas',
        },
    },
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
// Índices para consultas eficientes
GameRewardSchema.index({ name: 1 }, { unique: true });
GameRewardSchema.index({ category: 1 });
GameRewardSchema.index({ type: 1 });
GameRewardSchema.index({ rarity: 1 });
GameRewardSchema.index({ isLimited: 1 });
GameRewardSchema.index({ isHidden: 1 });
GameRewardSchema.index({ 'unlockConditions.type': 1 });
/**
 * Método estático para crear las recompensas predeterminadas
 */
GameRewardSchema.statics.createDefaultRewards = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const rewards = [
            // Logros generales
            {
                name: 'first_game',
                displayName: {
                    es: 'Primer Juego',
                    en: 'First Game',
                },
                description: {
                    es: 'Completa tu primera partida en el juego',
                    en: 'Complete your first game',
                },
                category: RewardCategory.GENERAL,
                type: RewardType.ACHIEVEMENT,
                rarity: RewardRarity.COMMON,
                unlockConditions: [
                    {
                        type: 'gamesPlayed',
                        threshold: 1,
                        comparison: 'gte',
                        description: 'Jugar una partida completa',
                    },
                ],
                points: 10,
                isHidden: false,
                isLimited: false,
            },
            // Logro de dibujo
            {
                name: 'artist_beginner',
                displayName: {
                    es: 'Artista Principiante',
                    en: 'Beginner Artist',
                },
                description: {
                    es: 'Haz que otros jugadores adivinen correctamente 10 de tus dibujos',
                    en: 'Have other players correctly guess 10 of your drawings',
                },
                category: RewardCategory.DRAWING,
                type: RewardType.BADGE,
                rarity: RewardRarity.UNCOMMON,
                unlockConditions: [
                    {
                        type: 'correctlyGuessedDrawings',
                        threshold: 10,
                        comparison: 'gte',
                        description: 'Que adivinen 10 dibujos tuyos',
                    },
                ],
                points: 25,
                isHidden: false,
                isLimited: false,
            },
            // Logro de adivinanzas
            {
                name: 'fast_guesser',
                displayName: {
                    es: 'Adivino Veloz',
                    en: 'Fast Guesser',
                },
                description: {
                    es: 'Adivina correctamente una palabra en menos de 10 segundos',
                    en: 'Correctly guess a word in less than 10 seconds',
                },
                category: RewardCategory.GUESSING,
                type: RewardType.TITLE,
                rarity: RewardRarity.RARE,
                unlockConditions: [
                    {
                        type: 'fastestGuessTime',
                        threshold: 10,
                        comparison: 'lt',
                        description: 'Adivinar en menos de 10 segundos',
                    },
                ],
                points: 50,
                isHidden: false,
                isLimited: false,
            },
        ];
        for (const reward of rewards) {
            // Verificar si ya existe
            const exists = yield this.findOne({ name: reward.name });
            if (!exists) {
                yield this.create(reward);
            }
        }
    });
};
// Exportar el modelo
exports.GameRewardModel = (0, mongoose_1.model)('GameReward', GameRewardSchema);
/**
 * Esquema para registrar recompensas obtenidas por usuarios
 */
const UserRewardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rewardId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'GameReward',
        required: true,
    },
    rewardName: {
        type: String,
        required: true,
    },
    unlockedAt: {
        type: Date,
        default: Date.now,
    },
    isNew: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Índice compuesto único para evitar duplicados
UserRewardSchema.index({ userId: 1, rewardId: 1 }, { unique: true });
// Índices adicionales
UserRewardSchema.index({ userId: 1, isNew: 1 }); // Para consultar nuevas recompensas por usuario
UserRewardSchema.index({ unlockedAt: -1 }); // Para ordenar por fecha de desbloqueo
// Exportar el modelo de recompensas de usuario
exports.UserRewardModel = (0, mongoose_1.model)('UserReward', UserRewardSchema);
