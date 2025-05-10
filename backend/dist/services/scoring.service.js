"use strict";
// Servicio de puntuación base para el juego
// Autor: Task Master AI
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreHistory = void 0;
exports.calculateBaseScore = calculateBaseScore;
exports.calculatePlayerLevel = calculatePlayerLevel;
exports.generateLeaderboard = generateLeaderboard;
exports.registerScoreEvent = registerScoreEvent;
exports.getPlayerHistory = getPlayerHistory;
// Configuración de tramos de bonificación por velocidad
const SPEED_BONUS_THRESHOLDS = [2000, 5000, 10000]; // ms
const SPEED_BONUS_MULTIPLIERS = [2, 1.5, 1.2, 1]; // <2s, 2-5s, 5-10s, >10s
/**
 * Calcula la puntuación base de un jugador según el evento del juego.
 * @param event Evento del juego (acierto, fallo, participación)
 * @param player Estado actual del jugador
 * @returns ScoreResult con el desglose de puntos
 */
function calculateBaseScore(event, player) {
    let puntos = 0;
    let bonus = 0;
    let penalizacion = 0;
    let multiplicador = 1;
    switch (event.type) {
        case 'acierto':
            puntos = 100;
            // Bonus por racha de aciertos
            if (event.streak && event.streak > 1) {
                bonus = 20 * (event.streak - 1);
            }
            // Bonificación por velocidad
            if (typeof event.responseTimeMs === 'number') {
                if (event.responseTimeMs < SPEED_BONUS_THRESHOLDS[0]) {
                    multiplicador = SPEED_BONUS_MULTIPLIERS[0];
                }
                else if (event.responseTimeMs < SPEED_BONUS_THRESHOLDS[1]) {
                    multiplicador = SPEED_BONUS_MULTIPLIERS[1];
                }
                else if (event.responseTimeMs < SPEED_BONUS_THRESHOLDS[2]) {
                    multiplicador = SPEED_BONUS_MULTIPLIERS[2];
                }
                else {
                    multiplicador = SPEED_BONUS_MULTIPLIERS[3];
                }
            }
            break;
        case 'fallo':
            penalizacion = -50;
            break;
        case 'participacion':
            puntos = 10;
            break;
        default:
            break;
    }
    // Solo los aciertos reciben multiplicador de velocidad
    const total = player.puntosActuales + (puntos + bonus) * multiplicador + penalizacion;
    return { puntos, bonus, penalizacion, total };
}
const LEVELS = [
    { min: 0, max: 100, nombre: 'Principiante', recompensa: 'Desbloqueo de avatar básico' },
    { min: 101, max: 250, nombre: 'Aprendiz', recompensa: 'Sticker especial' },
    { min: 251, max: 500, nombre: 'Competidor', recompensa: 'Color de sala personalizado' },
    { min: 501, max: 1000, nombre: 'Experto', recompensa: 'Acceso a modos avanzados' },
    { min: 1001, max: Infinity, nombre: 'Leyenda', recompensa: 'Marco dorado y logros exclusivos' },
];
/**
 * Calcula el nivel del jugador según su puntuación total.
 * @param score Puntuación total del jugador
 * @returns LevelInfo con nivel, nombre, puntos actuales y para siguiente nivel
 */
function calculatePlayerLevel(score) {
    for (let i = 0; i < LEVELS.length; i++) {
        const lvl = LEVELS[i];
        if (score >= lvl.min && score <= lvl.max) {
            return {
                nivel: i + 1,
                nombre: lvl.nombre,
                puntosActuales: score,
                puntosParaSiguiente: lvl.max === Infinity ? 0 : lvl.max - score + 1,
                recompensa: lvl.recompensa,
            };
        }
    }
    // Fallback (no debería ocurrir)
    return {
        nivel: 1,
        nombre: LEVELS[0].nombre,
        puntosActuales: score,
        puntosParaSiguiente: LEVELS[0].max - score + 1,
        recompensa: LEVELS[0].recompensa,
    };
}
/**
 * Genera una tabla de clasificación ordenada por puntuación, nivel y nombre.
 * @param jugadores Array de jugadores con puntuación y nivel
 * @returns Array de LeaderboardEntry ordenado
 */
function generateLeaderboard(jugadores) {
    // Ordenar por puntuación descendente, luego nivel descendente, luego nombre ascendente
    const ordenada = [...jugadores].sort((a, b) => {
        if (b.puntuacion !== a.puntuacion)
            return b.puntuacion - a.puntuacion;
        if (b.nivel !== a.nivel)
            return b.nivel - a.nivel;
        if (a.nombre !== b.nombre)
            return a.nombre.localeCompare(b.nombre);
        return a.ultimoCambio - b.ultimoCambio;
    });
    // Asignar posición
    return ordenada.map((jugador, idx) => (Object.assign(Object.assign({}, jugador), { posicion: idx + 1 })));
}
// Almacenamiento en memoria (para pruebas y desarrollo)
exports.scoreHistory = [];
/**
 * Registra un evento de puntuación en el historial.
 */
function registerScoreEvent(event) {
    exports.scoreHistory.push(event);
}
/**
 * Obtiene el historial completo de un jugador, con opción de filtrar por fecha y tipo de evento.
 */
function getPlayerHistory(playerId, options) {
    return exports.scoreHistory.filter((e) => {
        if (e.playerId !== playerId)
            return false;
        if ((options === null || options === void 0 ? void 0 : options.from) && e.timestamp < options.from)
            return false;
        if ((options === null || options === void 0 ? void 0 : options.to) && e.timestamp > options.to)
            return false;
        if ((options === null || options === void 0 ? void 0 : options.eventTypes) && !options.eventTypes.includes(e.eventType))
            return false;
        return true;
    });
}
