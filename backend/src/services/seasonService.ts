import SeasonModel, { ISeason } from '../models/Season.model';
import leaderboardService from './leaderboardService'; // Para obtener ganadores

class SeasonService {
  async createSeason(seasonData: Partial<ISeason>): Promise<ISeason> {
    try {
      // Validar que leaderboardCategoryKey no esté ya en uso por otra temporada si es necesario
      // o manejarlo a nivel de schema unique index
      const season = new SeasonModel(seasonData);
      await season.save();
      return season;
    } catch (error) {
      console.error('Error al crear la temporada:', error);
      throw error;
    }
  }

  async getActiveSeasons(): Promise<ISeason[]> {
    try {
      return await SeasonModel.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }).sort({ endDate: 1 });
    } catch (error) {
      console.error('Error al obtener temporadas activas:', error);
      throw error;
    }
  }

  async getAllSeasons(includePast = true): Promise<ISeason[]> {
    try {
      const query = includePast ? {} : { endDate: { $gte: new Date() } };
      return await SeasonModel.find(query).sort({ startDate: -1 });
    } catch (error) {
      console.error('Error al obtener todas las temporadas:', error);
      throw error;
    }
  }

  async getSeasonById(id: string): Promise<ISeason | null> {
    try {
      return await SeasonModel.findById(id);
    } catch (error) {
      console.error(`Error al obtener la temporada ${id}:`, error);
      throw error;
    }
  }

  async updateSeason(id: string, updateData: Partial<ISeason>): Promise<ISeason | null> {
    try {
      return await SeasonModel.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      console.error(`Error al actualizar la temporada ${id}:`, error);
      throw error;
    }
  }

  /**
   * Intenta activar temporadas cuya fecha de inicio ha llegado y aún no están activas.
   * Podría ser llamado por un job programado.
   */
  async activateDueSeasons(): Promise<void> {
    try {
      const now = new Date();
      await SeasonModel.updateMany(
        { isActive: false, startDate: { $lte: now }, endDate: { $gte: now } },
        { $set: { isActive: true } },
      );
      console.log('Temporadas debidas activadas.');
    } catch (error) {
      console.error('Error activando temporadas debidas:', error);
    }
  }

  /**
   * Finaliza temporadas cuya fecha de finalización ha pasado y aún están activas.
   * Calcula ganadores y potencialmente otorga recompensas.
   * Podría ser llamado por un job programado.
   */
  async concludeEndedSeasons(): Promise<void> {
    try {
      const now = new Date();
      const seasonsToConclude = await SeasonModel.find({
        isActive: true,
        endDate: { $lt: now },
      });

      for (const season of seasonsToConclude) {
        season.isActive = false;
        // Lógica para calcular ganadores y otorgar recompensas
        if (season.rewards && season.rewards.length > 0) {
          const leaderboard = await leaderboardService.getLeaderboard(season.leaderboardCategoryKey, 100); // Obtener top 100 por ejemplo
          console.log(`Procesando recompensas para la temporada: ${season.name}`);
          for (const rewardTier of season.rewards) {
            const winnersInTier = leaderboard.entries.filter(
              (entry) => entry.rank && entry.rank >= rewardTier.rankMin && entry.rank <= rewardTier.rankMax,
            );
            for (const winner of winnersInTier) {
              console.log(`Jugador ${winner.username} (ID: ${winner.userId}) ganó: ${rewardTier.description}`);
              // Aquí iría la lógica para otorgar la recompensa real (ej. añadir item a inventario, dar monedas virtuales)
              // Esto dependería de otros sistemas (inventario, moneda virtual) que no están definidos aún.
            }
          }
        }
        await season.save();
        console.log(`Temporada ${season.name} finalizada.`);
      }
    } catch (error) {
      console.error('Error finalizando temporadas:', error);
    }
  }
}

const seasonService = new SeasonService();
export default seasonService;
