"use strict";
// Servicio básico para obtener configuración de salas
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
exports.getRoomConfig = void 0;
const defaultConfig = {
    maxPlayers: 8,
    roundTime: 90,
    totalRounds: 3,
    wordCategories: ['animales', 'objetos', 'comida', 'deportes', 'países'],
    difficulty: 'medium',
    allowCustomWords: false,
    customWords: [],
};
const getRoomConfig = (configId) => __awaiter(void 0, void 0, void 0, function* () {
    // En una implementación real, buscaría en la base de datos
    return defaultConfig;
});
exports.getRoomConfig = getRoomConfig;
