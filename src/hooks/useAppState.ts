import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Game, RoundNumber } from '../types';
import { DEFAULT_GRID, DEFAULT_COLUMN_DIGITS, DEFAULT_ROW_DIGITS } from '../data/constants';
import { generateDefaultGames, calculateGameResult } from '../utils/gameUtils';
import { fetchBoardState, saveBoardConfig, syncAllGames, updateSingleGame, deleteGame as apiDeleteGame } from '../utils/api';

const STORAGE_KEY = 'march-madness-squares-2026';

function getDefaultState(): AppState {
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

function loadLocalState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        grid: parsed.grid ?? DEFAULT_GRID,
        columnDigits: parsed.columnDigits ?? DEFAULT_COLUMN_DIGITS,
        rowDigits: parsed.rowDigits ?? DEFAULT_ROW_DIGITS,
      };
    }
  } catch (e) {
    console.error('Failed to load local state:', e);
  }
  return getDefaultState();
}

function saveLocalState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save local state:', e);
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadLocalState);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to track if we should skip the next DB save (e.g., after loading from DB)
  const skipNextDbSave = useRef(false);

  // Load from database on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dbState = await fetchBoardState();
        if (cancelled) return;
        if (dbState) {
          setDbConnected(true);
          const merged: AppState = {
            grid: dbState.grid ?? DEFAULT_GRID,
            games: dbState.games ?? [],
            adminPassword: dbState.adminPassword ?? 'madness2026',
            tournamentYear: dbState.tournamentYear ?? 2026,
            lastUpdated: dbState.lastUpdated ?? new Date().toISOString(),
            columnDigits: dbState.columnDigits ?? DEFAULT_COLUMN_DIGITS,
            rowDigits: dbState.rowDigits ?? DEFAULT_ROW_DIGITS,
          };
          skipNextDbSave.current = true;
          setState(merged);
          saveLocalState(merged);
        }
      } catch (e) {
        console.error('Failed to load from database:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveLocalState(state);
  }, [state]);

  // Helper to save board config to DB (grid, digits, etc.)
  const saveBoardToDb = useCallback(async (newState: AppState) => {
    if (!dbConnected) return;
    await saveBoardConfig({
      grid: newState.grid,
      columnDigits: newState.columnDigits,
      rowDigits: newState.rowDigits,
    });
  }, [dbConnected]);

  const updateGrid = useCallback((grid: string[][]) => {
    setState(prev => {
      const next = { ...prev, grid, lastUpdated: new Date().toISOString() };
      if (dbConnected) {
        saveBoardConfig({ grid, columnDigits: prev.columnDigits, rowDigits: prev.rowDigits });
      }
      return next;
    });
  }, [dbConnected]);

  const updateDigitOrder = useCallback((columnDigits: number[], rowDigits: number[]) => {
    setState(prev => {
      const next = { ...prev, columnDigits, rowDigits, lastUpdated: new Date().toISOString() };
      if (dbConnected) {
        saveBoardConfig({ grid: prev.grid, columnDigits, rowDigits });
      }
      return next;
    });
  }, [dbConnected]);

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    setState(prev => {
      const games = prev.games.map(g => {
        if (g.id !== gameId) return g;
        const updated = { ...g, ...updates };

        if (updated.topTeamScore != null && updated.bottomTeamScore != null && updated.topTeam && updated.bottomTeam) {
          const calculated = calculateGameResult(updated, prev.grid, prev.columnDigits, prev.rowDigits);
          const finalGame = { ...updated, ...calculated };
          if (dbConnected) updateSingleGame(finalGame);
          return finalGame;
        }
        if (dbConnected) updateSingleGame(updated);
        return updated;
      });
      return { ...prev, games, lastUpdated: new Date().toISOString() };
    });
  }, [dbConnected]);

  const addGame = useCallback((game: Game) => {
    setState(prev => {
      const next = {
        ...prev,
        games: [...prev.games, game],
        lastUpdated: new Date().toISOString(),
      };
      if (dbConnected) updateSingleGame(game);
      return next;
    });
  }, [dbConnected]);

  const removeGame = useCallback((gameId: string) => {
    setState(prev => ({
      ...prev,
      games: prev.games.filter(g => g.id !== gameId),
      lastUpdated: new Date().toISOString(),
    }));
    if (dbConnected) apiDeleteGame(gameId);
  }, [dbConnected]);

  const recalculateAllGames = useCallback(() => {
    setState(prev => {
      const games = prev.games.map(g => {
        if (g.topTeamScore != null && g.bottomTeamScore != null && g.topTeam && g.bottomTeam) {
          const calculated = calculateGameResult(g, prev.grid, prev.columnDigits, prev.rowDigits);
          return { ...g, ...calculated };
        }
        return g;
      });
      const next = { ...prev, games, lastUpdated: new Date().toISOString() };
      if (dbConnected) syncAllGames(games);
      return next;
    });
  }, [dbConnected]);

  const resetGames = useCallback(() => {
    const games = generateDefaultGames();
    setState(prev => ({
      ...prev,
      games,
      lastUpdated: new Date().toISOString(),
    }));
    if (dbConnected) syncAllGames(games);
  }, [dbConnected]);

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
    if (dbConnected) syncAllGames(games);
  }, [dbConnected]);

  return {
    state,
    isAdmin,
    isLoading,
    dbConnected,
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
