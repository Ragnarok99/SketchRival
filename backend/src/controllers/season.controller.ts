import { Request, Response } from 'express';
import seasonService from '../services/seasonService';
import leaderboardService from '../services/leaderboardService';

class SeasonController {
  async createSeason(req: Request, res: Response) {
    try {
      const newSeason = await seasonService.createSeason(req.body);
      return res.status(201).json({ success: true, data: newSeason });
    } catch (error) {
      console.error('Error al crear temporada:', error);
      const message = error instanceof Error ? error.message : 'Error interno del servidor.';
      return res.status(500).json({ success: false, message });
    }
  }

  async getActiveSeasons(req: Request, res: Response) {
    try {
      const activeSeasons = await seasonService.getActiveSeasons();
      return res.status(200).json({ success: true, data: activeSeasons });
    } catch (error) {
      console.error('Error al obtener temporadas activas:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async getAllSeasons(req: Request, res: Response) {
    try {
      const includePast = req.query.includePast !== 'false'; // Default to true
      const allSeasons = await seasonService.getAllSeasons(includePast);
      return res.status(200).json({ success: true, data: allSeasons });
    } catch (error) {
      console.error('Error al obtener todas las temporadas:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async getSeasonById(req: Request, res: Response) {
    try {
      const season = await seasonService.getSeasonById(req.params.id);
      if (!season) {
        return res.status(404).json({ success: false, message: 'Temporada no encontrada.' });
      }
      return res.status(200).json({ success: true, data: season });
    } catch (error) {
      console.error('Error al obtener temporada por ID:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async updateSeason(req: Request, res: Response) {
    try {
      const updatedSeason = await seasonService.updateSeason(req.params.id, req.body);
      if (!updatedSeason) {
        return res.status(404).json({ success: false, message: 'Temporada no encontrada para actualizar.' });
      }
      return res.status(200).json({ success: true, data: updatedSeason });
    } catch (error) {
      console.error('Error al actualizar temporada:', error);
      const message = error instanceof Error ? error.message : 'Error interno del servidor.';
      return res.status(500).json({ success: false, message });
    }
  }

  async getSeasonLeaderboard(req: Request, res: Response) {
    try {
      const seasonId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const page = parseInt(req.query.page as string) || 1;

      const season = await seasonService.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ success: false, message: 'Temporada no encontrada.' });
      }

      const leaderboardData = await leaderboardService.getLeaderboard(season.leaderboardCategoryKey, limit, page);
      return res.status(200).json({ success: true, data: leaderboardData });
    } catch (error) {
      console.error('Error al obtener leaderboard de la temporada:', error);
      const message = error instanceof Error ? error.message : 'Error interno del servidor.';
      return res.status(500).json({ success: false, message });
    }
  }

  // Endpoints para ejecutar manualmente la activación/conclusión (para admins o jobs)
  async runActivateDueSeasons(req: Request, res: Response) {
    try {
      await seasonService.activateDueSeasons();
      return res.status(200).json({ success: true, message: 'Proceso de activación de temporadas ejecutado.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error ejecutando activación de temporadas.' });
    }
  }

  async runConcludeEndedSeasons(req: Request, res: Response) {
    try {
      await seasonService.concludeEndedSeasons();
      return res.status(200).json({ success: true, message: 'Proceso de conclusión de temporadas ejecutado.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error ejecutando conclusión de temporadas.' });
    }
  }
}

export default new SeasonController();
