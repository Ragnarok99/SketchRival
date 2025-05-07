import { body } from 'express-validator';
import { roomIdValidationRules } from './gameRooms.validation';

/**
 * Reglas de validación para establecer el estado de "listo"
 */
export const readyStatusValidationRules = () => {
  return [
    ...roomIdValidationRules(),
    body('ready').isBoolean().withMessage('El estado "ready" debe ser un valor booleano (true/false)'),
  ];
};

/**
 * Reglas de validación para expulsar a un jugador
 */
export const kickPlayerValidationRules = () => {
  return [...roomIdValidationRules(), body('playerId').isMongoId().withMessage('ID de jugador inválido')];
};

/**
 * Reglas de validación para iniciar el juego
 */
export const startGameValidationRules = () => {
  return [...roomIdValidationRules()];
};
