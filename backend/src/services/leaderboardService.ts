import LeaderboardEntryModel, { ILeaderboardEntry } from '../models/Leaderboard.model';
import { Types } from 'mongoose';

class LeaderboardService {
  /**
   * Actualiza la puntuación de un jugador en una categoría del leaderboard.
   * Solo actualiza si la nueva puntuación es mayor o si no existe entrada.
   * @param userId ID del usuario.
   * @param username Nombre del usuario (cacheado).
   * @param newScore Nueva puntuación del jugador.
   * @param level Nivel actual del jugador (opcional).
   * @param category Categoría del leaderboard (ej. 'global').
   */
  async updatePlayerScore(
    userId: string | Types.ObjectId,
    username: string,
    newScore: number,
    level?: number,
    category: string = 'global',
  ): Promise<ILeaderboardEntry | null> {
    try {
      const existingEntry = await LeaderboardEntryModel.findOne({
        userId,
        category,
      });

      if (existingEntry && newScore <= existingEntry.score) {
        // Si la nueva puntuación no es mejor, no hacer nada o solo actualizar lastGamePlayedAt
        existingEntry.lastGamePlayedAt = new Date();
        return await existingEntry.save();
      }

      const updatedEntry = await LeaderboardEntryModel.findOneAndUpdate(
        { userId, category },
        {
          $set: {
            username,
            score: newScore,
            level,
            lastGamePlayedAt: new Date(),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return updatedEntry;
    } catch (error) {
      console.error(
        `Error al actualizar la puntuación en el leaderboard para el usuario ${userId} en categoría ${category}:`,
        error,
      );
      throw error; // O manejar de forma más específica
    }
  }

  /**
   * Obtiene una tabla de líderes paginada para una categoría específica.
   * @param category Categoría del leaderboard.
   * @param limit Número de entradas por página.
   * @param page Número de página (1-indexed).
   * @returns Un objeto con las entradas y el total de entradas.
   */
  async getLeaderboard(
    category: string = 'global',
    limit: number = 20, // Un límite más razonable por defecto
    page: number = 1,
  ): Promise<{ entries: ILeaderboardEntry[]; totalEntries: number; currentPage: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const query = { category };

      const entries = await LeaderboardEntryModel.find(query)
        .sort({ score: -1, lastGamePlayedAt: 1 }) // Ordenar por puntuación, luego por actividad más reciente
        .skip(skip)
        .limit(limit)
        .lean(); // .lean() para objetos JS planos y más rápidos

      const totalEntries = await LeaderboardEntryModel.countDocuments(query);
      const totalPages = Math.ceil(totalEntries / limit);

      // Asignar rango dinámicamente basado en la posición en la consulta paginada
      const rankedEntries = entries.map((entry, index) => ({
        ...entry,
        rank: skip + index + 1,
      }));

      return {
        entries: rankedEntries as ILeaderboardEntry[], // castear después de añadir rank
        totalEntries,
        currentPage: page,
        totalPages,
      };
    } catch (error) {
      console.error(`Error al obtener el leaderboard para la categoría ${category}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el rango y la puntuación de un jugador específico en una categoría.
   * @param userId ID del usuario.
   * @param category Categoría del leaderboard.
   * @returns Un objeto con el rango y la puntuación, o null si no se encuentra.
   */
  async getPlayerRank(
    userId: string | Types.ObjectId,
    category: string = 'global',
  ): Promise<{ rank: number | null; score: number | null; entry: ILeaderboardEntry | null }> {
    try {
      const playerEntry = await LeaderboardEntryModel.findOne({ userId, category }).lean();

      if (!playerEntry) {
        return { rank: null, score: null, entry: null };
      }

      // Contar cuántos jugadores tienen una puntuación mayor (o igual y jugaron después)
      const higherRankCount = await LeaderboardEntryModel.countDocuments({
        category,
        $or: [
          { score: { $gt: playerEntry.score } },
          {
            score: playerEntry.score,
            lastGamePlayedAt: { $lt: playerEntry.lastGamePlayedAt }, // Jugadores más recientes con mismo score van primero
          },
        ],
      });

      return {
        rank: higherRankCount + 1,
        score: playerEntry.score,
        entry: playerEntry as ILeaderboardEntry,
      };
    } catch (error) {
      console.error(`Error al obtener el rango para el usuario ${userId} en categoría ${category}:`, error);
      throw error;
    }
  }
}

const leaderboardService = new LeaderboardService();
export default leaderboardService;
