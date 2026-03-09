import { RoundInfo, RoundNumber } from '../types';

export const TOTAL_POT = 2000;
export const BUY_IN = 20;
export const CHAMPIONSHIP_RIGHT_WAY = 280;
export const CHAMPIONSHIP_WRONG_WAY = 80;

export const ROUNDS: RoundInfo[] = [
  { round: 64, name: 'Round of 64', payoutPerGame: 10, totalGames: 32, totalPayout: 320 },
  { round: 32, name: 'Round of 32', payoutPerGame: 30, totalGames: 16, totalPayout: 480 },
  { round: 16, name: 'Sweet 16', payoutPerGame: 50, totalGames: 8, totalPayout: 400 },
  { round: 8, name: 'Elite 8', payoutPerGame: 80, totalGames: 4, totalPayout: 320 },
  { round: 4, name: 'Final Four', payoutPerGame: 100, totalGames: 2, totalPayout: 200 },
  { round: 2, name: 'Championship', payoutPerGame: 280, totalGames: 1, totalPayout: 280 },
];

export const ROUND_NAMES: Record<RoundNumber, string> = {
  68: 'First Four',
  64: 'Round of 64',
  32: 'Round of 32',
  16: 'Sweet 16',
  8: 'Elite 8',
  4: 'Final Four',
  2: 'Championship',
};

export function getPayoutForRound(round: RoundNumber): number {
  if (round === 68) return 0;
  const info = ROUNDS.find(r => r.round === round);
  return info?.payoutPerGame ?? 0;
}

export function getRoundName(round: RoundNumber): string {
  return ROUND_NAMES[round] ?? `Round of ${round}`;
}

export const DEFAULT_GRID: string[][] = [
  ['Eric Moore', 'Devin Pflueger', 'Chad Jones', '', 'Chad Jones', '', 'Spenser Todd', '', '', 'Shelby Moore'],
  ['Camden Jackson', 'Devin Pflueger', 'Colton Moore', 'Chad Jones', '', 'Cole Jackson', '', '', '', ''],
  ['Scott Askelson', 'Spenser Todd', 'Jackie Askelson', 'Devin Pflueger', 'Colton Moore', '', '', 'Chad Jones', 'Jaycek Jackson', ''],
  ['', 'Scott Askelson', '', 'Gunnar Gregory', 'Devin Pflueger', 'Colton Moore', '', '', 'Jason Simonton', 'Nikki Jackson'],
  ['Laura Brizell', '', 'Scott Askelson', '', '', 'Devin Pflueger', 'Colton Moore', 'Nick Capouch', '', 'Spenser Todd'],
  ['Morgan Carroll', '', 'Scott Brizell', 'Scott Askelson', '', 'Skyler Brady', 'Jason Simonton', 'Colton Moore', '', ''],
  ['', 'Morgan Carroll', 'Jason Simonton', 'Nick Capouch', 'Skyler Brady', 'Laura Brizell', 'Cole Jackson', '', 'Chad Jones', ''],
  ['', 'Jason Simonton', '', 'Skyler Brady', 'Spenser Todd', 'Morgan Carroll', 'Camden Jackson', 'Gunnar Gregory', '', ''],
  ['', 'Jaycek Jackson', 'Skyler Brady', '', 'Nikki Jackson', '', 'Morgan Carroll', 'Scott Brizell', '', ''],
  ['Shelby Moore', 'Skyler Brady', '', '', '', '', '', '', 'Morgan Carroll', 'Eric Moore'],
];

export const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;

// ESPN API endpoint for NCAA Men's Basketball
export const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Confetti-worthy rounds
export const CONFETTI_ROUNDS: RoundNumber[] = [8, 4, 2];
