import {
  calculateBaseScore,
  GameEvent,
  PlayerState,
  calculatePlayerLevel,
  generateLeaderboard,
  registerScoreEvent,
  getPlayerHistory,
  ScoreHistoryEvent,
  scoreHistory,
} from './scoring.service';

describe('calculateBaseScore', () => {
  const jugadorBase: PlayerState = {
    id: '1',
    nombre: 'Jugador1',
    puntosActuales: 0,
  };

  it('debe sumar puntos por acierto', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now() };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.puntos).toBe(100);
    expect(resultado.bonus).toBe(0);
    expect(resultado.penalizacion).toBe(0);
    expect(resultado.total).toBe(100);
  });

  it('debe sumar bonus por racha de aciertos', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), streak: 3 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.puntos).toBe(100);
    expect(resultado.bonus).toBe(40); // 20 * (3-1)
    expect(resultado.penalizacion).toBe(0);
    expect(resultado.total).toBe(140);
  });

  it('debe restar puntos por fallo', () => {
    const evento: GameEvent = { type: 'fallo', timestamp: Date.now() };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.puntos).toBe(0);
    expect(resultado.bonus).toBe(0);
    expect(resultado.penalizacion).toBe(-50);
    expect(resultado.total).toBe(-50);
  });

  it('debe sumar puntos por participación', () => {
    const evento: GameEvent = { type: 'participacion', timestamp: Date.now() };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.puntos).toBe(10);
    expect(resultado.bonus).toBe(0);
    expect(resultado.penalizacion).toBe(0);
    expect(resultado.total).toBe(10);
  });

  it('debe sumar correctamente al tener puntos previos', () => {
    const jugador: PlayerState = { ...jugadorBase, puntosActuales: 50 };
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), streak: 2 };
    const resultado = calculateBaseScore(evento, jugador);
    expect(resultado.total).toBe(100 + 20 + 50);
  });

  it('debe aplicar multiplicador x2 por respuesta <2s', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), responseTimeMs: 1500 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.total).toBe(100 * 2);
  });

  it('debe aplicar multiplicador x1.5 por respuesta entre 2-5s', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), responseTimeMs: 3000 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.total).toBe(100 * 1.5);
  });

  it('debe aplicar multiplicador x1.2 por respuesta entre 5-10s', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), responseTimeMs: 7000 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.total).toBe(100 * 1.2);
  });

  it('debe aplicar multiplicador x1 por respuesta >10s', () => {
    const evento: GameEvent = { type: 'acierto', timestamp: Date.now(), responseTimeMs: 15000 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.total).toBe(100 * 1);
  });

  it('no debe aplicar multiplicador de velocidad a fallos', () => {
    const evento: GameEvent = { type: 'fallo', timestamp: Date.now(), responseTimeMs: 1000 };
    const resultado = calculateBaseScore(evento, jugadorBase);
    expect(resultado.total).toBe(-50);
  });
});

describe('calculatePlayerLevel', () => {
  it('debe asignar nivel 1 (Principiante) para score 0', () => {
    const nivel = calculatePlayerLevel(0);
    expect(nivel.nivel).toBe(1);
    expect(nivel.nombre).toBe('Principiante');
    expect(nivel.puntosParaSiguiente).toBe(101);
  });
  it('debe asignar nivel 2 (Aprendiz) para score 150', () => {
    const nivel = calculatePlayerLevel(150);
    expect(nivel.nivel).toBe(2);
    expect(nivel.nombre).toBe('Aprendiz');
    expect(nivel.puntosParaSiguiente).toBe(101);
  });
  it('debe asignar nivel 3 (Competidor) para score 300', () => {
    const nivel = calculatePlayerLevel(300);
    expect(nivel.nivel).toBe(3);
    expect(nivel.nombre).toBe('Competidor');
    expect(nivel.puntosParaSiguiente).toBe(201);
  });
  it('debe asignar nivel 4 (Experto) para score 800', () => {
    const nivel = calculatePlayerLevel(800);
    expect(nivel.nivel).toBe(4);
    expect(nivel.nombre).toBe('Experto');
    expect(nivel.puntosParaSiguiente).toBe(201);
  });
  it('debe asignar nivel 5 (Leyenda) para score 2000', () => {
    const nivel = calculatePlayerLevel(2000);
    expect(nivel.nivel).toBe(5);
    expect(nivel.nombre).toBe('Leyenda');
    expect(nivel.puntosParaSiguiente).toBe(0);
  });
  it('debe asignar correctamente los puntos para siguiente nivel en el borde', () => {
    const nivel = calculatePlayerLevel(100);
    expect(nivel.nivel).toBe(1);
    expect(nivel.puntosParaSiguiente).toBe(1);
    const nivel2 = calculatePlayerLevel(101);
    expect(nivel2.nivel).toBe(2);
    expect(nivel2.puntosParaSiguiente).toBe(150);
  });
});

describe('generateLeaderboard', () => {
  const baseTime = Date.now();
  const jugadores = [
    { id: '1', nombre: 'Ana', puntuacion: 200, nivel: 2, ultimoCambio: baseTime },
    { id: '2', nombre: 'Luis', puntuacion: 300, nivel: 3, ultimoCambio: baseTime + 1000 },
    { id: '3', nombre: 'Zoe', puntuacion: 300, nivel: 2, ultimoCambio: baseTime + 2000 },
    { id: '4', nombre: 'Carlos', puntuacion: 200, nivel: 2, ultimoCambio: baseTime + 3000 },
    { id: '5', nombre: 'Bea', puntuacion: 200, nivel: 2, ultimoCambio: baseTime + 4000 },
  ];

  it('debe ordenar por puntuación descendente', () => {
    const tabla = generateLeaderboard(jugadores);
    expect(tabla[0].nombre).toBe('Luis');
    expect(tabla[1].nombre).toBe('Zoe');
  });

  it('debe desempatar por nivel descendente', () => {
    const tabla = generateLeaderboard(jugadores);
    expect(tabla[1].nombre).toBe('Zoe'); // Zoe tiene mismo score que Luis pero menor nivel
  });

  it('debe desempatar por nombre alfabético', () => {
    const tabla = generateLeaderboard(jugadores);
    expect(tabla[2].nombre).toBe('Ana');
    expect(tabla[3].nombre).toBe('Bea');
    expect(tabla[4].nombre).toBe('Carlos');
  });

  it('debe asignar posiciones correctamente', () => {
    const tabla = generateLeaderboard(jugadores);
    expect(tabla.map((j) => j.posicion)).toEqual([1, 2, 3, 4, 5]);
  });

  it('debe manejar lista vacía', () => {
    const tabla = generateLeaderboard([]);
    expect(tabla).toEqual([]);
  });
});

describe('Historial de puntuaciones', () => {
  const playerId = 'jugadorX';
  const now = Date.now();
  beforeEach(() => {
    scoreHistory.length = 0;
  });

  it('registra y recupera eventos correctamente', () => {
    const evento: ScoreHistoryEvent = { playerId, score: 100, level: 2, eventType: 'acierto', timestamp: now };
    registerScoreEvent(evento);
    const historial = getPlayerHistory(playerId);
    expect(historial.length).toBe(1);
    expect(historial[0]).toEqual(evento);
  });

  it('filtra por rango de fechas', () => {
    registerScoreEvent({ playerId, score: 50, level: 1, eventType: 'participacion', timestamp: now - 10000 });
    registerScoreEvent({ playerId, score: 100, level: 2, eventType: 'acierto', timestamp: now });
    const historial = getPlayerHistory(playerId, { from: now - 5000 });
    expect(historial.length).toBe(1);
    expect(historial[0].score).toBe(100);
  });

  it('filtra por tipo de evento', () => {
    registerScoreEvent({ playerId, score: 50, level: 1, eventType: 'participacion', timestamp: now });
    registerScoreEvent({ playerId, score: 100, level: 2, eventType: 'acierto', timestamp: now });
    const historial = getPlayerHistory(playerId, { eventTypes: ['acierto'] });
    expect(historial.length).toBe(1);
    expect(historial[0].eventType).toBe('acierto');
  });

  it('devuelve vacío si no hay eventos', () => {
    const historial = getPlayerHistory('otroJugador');
    expect(historial).toEqual([]);
  });
});
