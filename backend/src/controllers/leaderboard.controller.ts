import { Request, Response } from 'express';
import leaderboardService from '../services/leaderboardService';
import { IRequestWithUser } from '../middleware/auth.middleware'; // Para obtener el userId del usuario autenticado

class LeaderboardController {
  async getLeaderboard(req: Request, res: Response) {
    try {
      const category = (req.query.category as string) || 'global';
      const limit = parseInt(req.query.limit as string) || 20;
      const page = parseInt(req.query.page as string) || 1;

      if (limit <= 0 || page <= 0) {
        return res.status(400).json({ success: false, message: 'Limit y page deben ser números positivos.' });
      }

      const leaderboardData = await leaderboardService.getLeaderboard(category, limit, page);
      return res.status(200).json({ success: true, data: leaderboardData });
    } catch (error) {
      console.error('Error al obtener leaderboard:', error);
      const message = error instanceof Error ? error.message : 'Error interno del servidor al obtener leaderboard.';
      return res.status(500).json({ success: false, message });
    }
  }

  async getPlayerRank(req: IRequestWithUser, res: Response) {
    // Usar IRequestWithUser si se obtiene del token
    try {
      const userId = req.params.userId || req.user?.userId; // Tomar de params o del usuario autenticado
      const category = (req.query.category as string) || 'global';

      if (!userId) {
        return res.status(400).json({ success: false, message: 'UserID no especificado o usuario no autenticado.' });
      }

      const rankData = await leaderboardService.getPlayerRank(userId, category);

      if (!rankData || rankData.rank === null) {
        return res.status(404).json({ success: false, message: 'Jugador no encontrado en el leaderboard.' });
      }
      return res.status(200).json({ success: true, data: rankData });
    } catch (error) {
      console.error('Error al obtener el rango del jugador:', error);
      const message = error instanceof Error ? error.message : 'Error interno del servidor al obtener el rango.';
      return res.status(500).json({ success: false, message });
    }
  }
}

export default new LeaderboardController();
