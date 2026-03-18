import { useState, useEffect, useCallback } from 'react';
import { AppState, Game, RoundNumber } from '../types';
import { DEFAULT_GRID, DEFAULT_COLUMN_DIGITS, DEFAULT_ROW_DIGITS } from '../data/constants';
import { generateDefaultGames, calculateGameResult } from '../utils/gameUtils';

const STORAGE_KEY = 'march-madness-squares-2026';

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Always use the latest grid from code so updates are reflected
      return {
        ...parsed,
        grid: DEFAULT_GRID,
        columnDigits: parsed.columnDigits ?? DEFAULT_COLUMN_DIGITS,
        rowDigits: parsed.rowDigits ?? DEFAULT_ROW_DIGITS,
      };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }

  return {
    grid: DEFAULT_GRID,
    games: generateDefaultGames(),
    adminPassword: 'madness2026',
    tournamentYear: 2026,
    lastUpdated: new Date().toISOString(),
    columnDigits: DEFAULT_COLUMN_DIGITS,
    rowDigits: DEFAULT_ROW_DIGITS,
  };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateGrid = useCallback((grid: string[][]) => {
    setState(prev => ({ ...prev, grid, lastUpdated: new Date().toISOString() }));
  }, []);

  const updateDigitOrder = useCallback((columnDigits: number[], rowDigits: number[]) => {
    setState(prev => ({ ...prev, columnDigits, rowDigits, lastUpdated: new Date().toISOString() }));
  }, []);

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    setState(prev => {
      const games = prev.games.map(g => {
        if (g.id !== gameId) return g;
        const updated = { ...g, ...updates };

        // Auto-calculate results if scores are present
        if (updated.topTeamScore != null && updated.bottomTeamScore != null && updated.topTeam && updated.bottomTeam) {
          const calculated = calculateGameResult(updated, prev.grid, prev.columnDigits, prev.rowDigits);
          return { ...updated, ...calculated };
        }
        return updated;
      });
      return { ...prev, games, lastUpdated: new Date().toISOString() };
    });
  }, []);

  const addGame = useCallback((game: Game) => {
    setState(prev => ({
      ...prev,
      games: [...prev.games, game],
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const removeGame = useCallback((gameId: string) => {
    setState(prev => ({
      ...prev,
      games: prev.games.filter(g => g.id !== gameId),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const recalculateAllGames = useCallback(() => {
    setState(prev => {
      const games = prev.games.map(g => {
        if (g.topTeamScore != null && g.bottomTeamScore != null && g.topTeam && g.bottomTeam) {
          const calculated = calculateGameResult(g, prev.grid, prev.columnDigits, prev.rowDigits);
          return { ...g, ...calculated };
        }
        return g;
      });
      return { ...prev, games, lastUpdated: new Date().toISOString() };
    });
  }, []);

  const resetGames = useCallback(() => {
    setState(prev => ({
      ...prev,
      games: generateDefaultGames(),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const login = useCallback((password: string): boolean => {
    if (password === state.adminPassword) {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, [state.adminPassword]);

  const logout = useCallback(() => setIsAdmin(false), []);

  const syncGames = useCallback((games: Game[]) => {
    setState(prev => ({ ...prev, games, lastUpdated: new Date().toISOString() }));
  }, []);

  return {
    state,
    isAdmin,
    updateGrid,
    updateDigitOrder,
    updateGame,
    addGame,
    removeGame,
    recalculateAllGames,
    resetGames,
    syncGames,
    login,
    logout,
  };
}
