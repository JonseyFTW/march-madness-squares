export type GameStatus = 'upcoming' | 'in_progress' | 'final';

export type RoundNumber = 68 | 64 | 32 | 16 | 8 | 4 | 2;

export interface Square {
  row: number; // 0-9 (losing team last digit)
  col: number; // 0-9 (winning team last digit)
  owner: string; // person name or empty
  squareNumber: number; // 1-100
}

export interface Game {
  id: string;
  round: RoundNumber;
  gameNumber: number;
  region?: string;
  topTeam: string;
  bottomTeam: string;
  topTeamSeed?: number;
  bottomTeamSeed?: number;
  topTeamScore?: number;
  bottomTeamScore?: number;
  status: GameStatus;
  scheduledDate?: string;
  espnId?: string;
  statusDetail?: string;
  displayClock?: string;
  period?: number;
  winningTeam?: string;
  losingTeam?: string;
  winningDigit?: number;
  losingDigit?: number;
  squareWinner?: string;
  payout?: number;
  // Championship wrong way
  wrongWaySquareWinner?: string;
  wrongWayPayout?: number;
}

export interface Participant {
  name: string;
  squareCount: number;
  totalWinnings: number;
  wins: number;
  roundBreakdown: Record<string, number>;
  roi: number;
  squares: { row: number; col: number }[];
}

export interface AppState {
  grid: string[][]; // 10x10 grid of owner names
  games: Game[];
  adminPassword: string;
  tournamentYear: number;
  lastUpdated: string;
  columnDigits: number[]; // Winner's digit order (10 values, each 0-9)
  rowDigits: number[]; // Loser's digit order (10 values, each 0-9)
}

export interface RoundInfo {
  round: RoundNumber;
  name: string;
  payoutPerGame: number;
  totalGames: number;
  totalPayout: number;
}
