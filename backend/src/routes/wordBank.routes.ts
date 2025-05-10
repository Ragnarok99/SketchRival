import { Router } from 'express';
import wordBankController from '../controllers/wordBank.controller';
import { protectRoute as authenticate } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.get('/random', wordBankController.getRandomWords);

// Rutas protegidas (solo para usuarios autenticados)
router.get('/', authenticate, wordBankController.getAllCategories);
router.get('/:id', authenticate, wordBankController.getCategoryById);
router.post('/', authenticate, wordBankController.createCategory);
router.put('/:id', authenticate, wordBankController.updateCategory);
router.delete('/:id', authenticate, wordBankController.deactivateCategory);
router.post('/:id/words', authenticate, wordBankController.addWordToCategory);
router.delete('/:categoryId/words/:wordId', authenticate, wordBankController.removeWordFromCategory);

export default router;
