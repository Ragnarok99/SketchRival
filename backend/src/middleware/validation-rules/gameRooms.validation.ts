import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { GameRoomType, GameRoomStatus } from '../../models/GameRoom.model';

export const createRoomValidationRules = () => {
  return [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),

    body('type').optional().isIn(Object.values(GameRoomType)).withMessage('Tipo de sala inválido'),

    // Validación del objeto de configuración
    body('configuration.maxPlayers')
      .optional()
      .isInt({ min: 2, max: 10 })
      .withMessage('El número máximo de jugadores debe estar entre 2 y 10'),

    body('configuration.roundTime')
      .optional()
      .isInt({ min: 30, max: 300 })
      .withMessage('El tiempo por ronda debe estar entre 30 y 300 segundos'),

    body('configuration.totalRounds')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('El número total de rondas debe estar entre 1 y 20'),

    body('configuration.drawingCategories').optional().isArray().withMessage('Las categorías deben ser un arreglo'),

    body('configuration.allowCustomWords')
      .optional()
      .isBoolean()
      .withMessage('allowCustomWords debe ser un valor booleano'),

    body('configuration.customWords')
      .optional()
      .isArray()
      .withMessage('Las palabras personalizadas deben ser un arreglo'),

    body('configuration.difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('La dificultad debe ser easy, medium o hard'),
  ];
};

export const updateRoomValidationRules = () => {
  return [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),

    body('status').optional().isIn(Object.values(GameRoomStatus)).withMessage('Estado de sala inválido'),

    // Validaciones para configuración igual que en createRoomValidationRules
    body('configuration.maxPlayers')
      .optional()
      .isInt({ min: 2, max: 10 })
      .withMessage('El número máximo de jugadores debe estar entre 2 y 10'),

    body('configuration.roundTime')
      .optional()
      .isInt({ min: 30, max: 300 })
      .withMessage('El tiempo por ronda debe estar entre 30 y 300 segundos'),

    body('configuration.totalRounds')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('El número total de rondas debe estar entre 1 y 20'),

    body('configuration.drawingCategories').optional().isArray().withMessage('Las categorías deben ser un arreglo'),

    body('configuration.allowCustomWords')
      .optional()
      .isBoolean()
      .withMessage('allowCustomWords debe ser un valor booleano'),

    body('configuration.customWords')
      .optional()
      .isArray()
      .withMessage('Las palabras personalizadas deben ser un arreglo'),

    body('configuration.difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('La dificultad debe ser easy, medium o hard'),
  ];
};

export const roomIdValidationRules = () => {
  return [param('id').isMongoId().withMessage('ID de sala inválido')];
};

export const joinRoomValidationRules = () => {
  return [
    body('accessCode')
      .optional()
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('El código de acceso debe tener entre 6 y 8 caracteres'),
  ];
};

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors: { [key: string]: string }[] = [];
  errors.array().map((err) => {
    if (err.type === 'field') {
      extractedErrors.push({ [err.path]: err.msg });
    }
  });

  return res.status(422).json({
    errors: extractedErrors,
  });
};
