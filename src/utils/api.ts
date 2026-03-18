import { AppState, Game } from '../types';

const BOARD_ID = 'default';

function getBaseUrl(): string {
  // In production, API routes are at the same origin
  // In development, Vite proxies or we use relative URLs
  return '';
}

export async function fetchBoardState(): Promise<AppState | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/state?boardId=${BOARD_ID}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch state: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch board state:', error);
    return null;
  }
}

export async function saveBoardConfig(state: {
  grid: string[][];
  columnDigits: number[];
  rowDigits: number[];
  adminPassword?: string;
  tournamentYear?: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: BOARD_ID, ...state }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to save board config:', error);
    return false;
  }
}

export async function syncAllGames(games: Game[]): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: BOARD_ID, games }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to sync games:', error);
    return false;
  }
}

export async function updateSingleGame(game: Game): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/games`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: BOARD_ID, game }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to update game:', error);
    return false;
  }
}

export async function deleteGame(gameId: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/games?boardId=${BOARD_ID}&gameId=${gameId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to delete game:', error);
    return false;
  }
}

export async function seedDatabase(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/seed`, {
      method: 'POST',
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
}
