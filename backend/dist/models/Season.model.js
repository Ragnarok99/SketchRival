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
exports.SeasonModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SeasonRewardSchema = new mongoose_1.Schema({
    rankMin: { type: Number, required: true },
    rankMax: { type: Number, required: true },
    description: { type: String, required: true },
    // rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' }, // Si tuvieras un modelo Reward
}, { _id: false });
const SeasonSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    leaderboardCategoryKey: {
        // Usado para enlazar con LeaderboardEntryModel.category
        type: String,
        required: true,
        unique: true, // Cada temporada debe tener una clave de leaderboard única
        index: true,
    },
    rewards: [SeasonRewardSchema],
}, {
    timestamps: true, // createdAt, updatedAt
});
SeasonSchema.index({ startDate: 1, endDate: 1 });
// Validar que endDate sea posterior a startDate
SeasonSchema.pre('save', function (next) {
    if (this.endDate <= this.startDate) {
        next(new Error('La fecha de finalización debe ser posterior a la fecha de inicio.'));
    }
    else {
        next();
    }
});
// Modelo para las Temporadas
exports.SeasonModel = mongoose_1.default.model('Season', SeasonSchema);
exports.default = exports.SeasonModel;
