import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { GameRoomType } from '../../models/GameRoom.model';
import { ConfigPreset, AVAILABLE_CATEGORIES } from '../../services/roomConfiguration.service';

export const createRoomWithConfigValidationRules = () => {
  return [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de la sala debe tener entre 3 y 50 caracteres'),

    body('type').optional().isIn(Object.values(GameRoomType)).withMessage('Tipo de sala inválido'),

    body('preset').optional().isIn(Object.values(ConfigPreset)).withMessage('Preset de configuración inválido'),

    // Validaciones de configuración

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

    body('configuration.drawingCategories')
      .optional()
      .isArray()
      .withMessage('Las categorías deben ser un arreglo')
      .custom((categories) => {
        if (!Array.isArray(categories) || categories.length === 0) {
          throw new Error('Debe seleccionar al menos una categoría');
        }

        // Verificar que todas las categorías sean válidas
        const invalidCategories = categories.filter((cat: string) => !AVAILABLE_CATEGORIES.includes(cat));

        if (invalidCategories.length > 0) {
          throw new Error(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
        }

        return true;
      }),

    body('configuration.allowCustomWords')
      .optional()
      .isBoolean()
      .withMessage('allowCustomWords debe ser un valor booleano'),

    body('configuration.customWords')
      .optional()
      .isArray()
      .withMessage('Las palabras personalizadas deben ser un arreglo')
      .custom((words, { req }) => {
        // Solo validar si allowCustomWords es true
        if (req.body.configuration.allowCustomWords === true) {
          if (!Array.isArray(words) || words.length === 0) {
            throw new Error('Debe proporcionar al menos una palabra personalizada');
          }
        }
        return true;
      }),

    body('configuration.difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('La dificultad debe ser easy, medium o hard'),
  ];
};

export const updateRoomConfigValidationRules = () => {
  return [
    body('preset').optional().isIn(Object.values(ConfigPreset)).withMessage('Preset de configuración inválido'),

    // Mismas validaciones que en createRoomWithConfigValidationRules

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

    body('configuration.drawingCategories')
      .optional()
      .isArray()
      .withMessage('Las categorías deben ser un arreglo')
      .custom((categories) => {
        if (categories && (!Array.isArray(categories) || categories.length === 0)) {
          throw new Error('Debe seleccionar al menos una categoría');
        }

        if (categories) {
          // Verificar que todas las categorías sean válidas
          const invalidCategories = categories.filter((cat: string) => !AVAILABLE_CATEGORIES.includes(cat));

          if (invalidCategories.length > 0) {
            throw new Error(`Las siguientes categorías no son válidas: ${invalidCategories.join(', ')}`);
          }
        }

        return true;
      }),

    body('configuration.allowCustomWords')
      .optional()
      .isBoolean()
      .withMessage('allowCustomWords debe ser un valor booleano'),

    body('configuration.customWords')
      .optional()
      .isArray()
      .withMessage('Las palabras personalizadas deben ser un arreglo')
      .custom((words, { req }) => {
        // Solo validar si allowCustomWords es true
        if (req.body.configuration && req.body.configuration.allowCustomWords === true) {
          if (!Array.isArray(words) || words.length === 0) {
            throw new Error('Debe proporcionar al menos una palabra personalizada');
          }
        }
        return true;
      }),

    body('configuration.difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('La dificultad debe ser easy, medium o hard'),
  ];
};

export const roomIdValidationRules = () => {
  return [param('id').isMongoId().withMessage('ID de sala inválido')];
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
