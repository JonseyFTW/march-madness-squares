import { useState, useEffect, useCallback, useRef } from 'react';
import { Game } from '../types';
import { fetchAllTournamentGames, mergeESPNGames, fetchPreviousScore } from '../utils/espnApi';
import { calculateGameResult } from '../utils/gameUtils';

const POLL_INTERVAL_LIVE = 30_000; // 30 seconds when games are live
const POLL_INTERVAL_IDLE = 5 * 60_000; // 5 minutes when no live games

interface UseESPNSyncOptions {
  games: Game[];
  grid: string[][];
  columnDigits: number[];
  rowDigits: number[];
  onSyncGames: (games: Game[]) => void;
}

export function useESPNSync({ games, grid, columnDigits, rowDigits, onSyncGames }: UseESPNSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use refs to avoid sync callback depending on games/grid (which change on every sync)
  const gamesRef = useRef(games);
  const gridRef = useRef(grid);
  const columnDigitsRef = useRef(columnDigits);
  const rowDigitsRef = useRef(rowDigits);
  const onSyncRef = useRef(onSyncGames);

  gamesRef.current = games;
  gridRef.current = grid;
  columnDigitsRef.current = columnDigits;
  rowDigitsRef.current = rowDigits;
  onSyncRef.current = onSyncGames;

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await fetchAllTournamentGames();

      if (result.error) {
        setSyncError(result.error);
        return;
      }

      if (result.games.length === 0) {
        setSyncError('No tournament games found yet.');
        return;
      }

      // Merge ESPN data with existing games
      let merged = mergeESPNGames(result.games, gamesRef.current);

      // Recalculate results for final games
      merged = merged.map(g => {
        if (g.topTeamScore != null && g.bottomTeamScore != null && g.topTeam && g.bottomTeam && g.status === 'final') {
          const calculated = calculateGameResult(g, gridRef.current, columnDigitsRef.current, rowDigitsRef.current);
          return { ...g, ...calculated };
        }
        return g;
      });

      // Fetch previous scores for final games that don't have them yet
      const needsPrevScore = merged.filter(
        g => g.status === 'final' && g.espnId && g.previousWinScore == null
      );
      if (needsPrevScore.length > 0) {
        const prevScoreResults = await Promise.all(
          needsPrevScore.map(async (g) => {
            const prev = await fetchPreviousScore(g.espnId!);
            if (!prev) return null;
            // Map home/away scores to top/bottom based on topTeamIsHome
            const topIsHome = g.topTeamIsHome !== false; // default true
            const topPrev = topIsHome ? prev.previousHomeScore : prev.previousAwayScore;
            const bottomPrev = topIsHome ? prev.previousAwayScore : prev.previousHomeScore;
            // Determine win/lose previous scores
            const winScore = Math.max(g.topTeamScore!, g.bottomTeamScore!);
            const loseScore = Math.min(g.topTeamScore!, g.bottomTeamScore!);
            const topWon = g.topTeamScore! >= g.bottomTeamScore!;
            return {
              espnId: g.espnId,
              previousWinScore: topWon ? topPrev : bottomPrev,
              previousLoseScore: topWon ? bottomPrev : topPrev,
            };
          })
        );
        for (const result of prevScoreResults) {
          if (!result) continue;
          const game = merged.find(g => g.espnId === result.espnId);
          if (game) {
            game.previousWinScore = result.previousWinScore;
            game.previousLoseScore = result.previousLoseScore;
          }
        }
      }

      const live = merged.filter(g => g.status === 'in_progress').length;
      setLiveCount(live);
      setLastSync(new Date());
      onSyncRef.current(merged);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, []); // No dependencies — uses refs

  // Set up polling interval based on whether games are live
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const interval = liveCount > 0 ? POLL_INTERVAL_LIVE : POLL_INTERVAL_IDLE;
    intervalRef.current = setInterval(sync, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveCount, sync]);

  // Initial sync on mount
  useEffect(() => {
    sync();
  }, [sync]);

  return { isSyncing, lastSync, syncError, liveCount, sync };
}
