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
  ['Eric Moore', 'Devin Pflueger', 'Chad Jones', 'Lance McIlvain', 'Chad Jones', 'Rene Anderson', 'Spenser Todd', 'Scott Askelson', 'Sarah McFarland', 'Shelby Moore'],
  ['Sarah McFarland', 'Camden Jackson', 'Devin Pflueger', 'Colton Moore', 'Chad Jones', 'Eric McFarland', 'Cole Jackson', 'Tuff Brady', 'Scott Askelson', 'Tommy Thacker'],
  ['Scott Askelson', 'Spenser Todd', 'Jackie Askelson', 'Devin Pflueger', 'Colton Moore', 'Ty McFarland', 'Rene Anderson', 'Chad Jones', 'Jaycek Jackson', 'Scott Askelson'],
  ['Karen McIlvain', 'Scott Askelson', 'Ryan Millett', 'Gunnar Gregory', 'Devin Pflueger', 'Colton Moore', 'Collin Strawn', 'Rene Anderson', 'Jason Simonton', 'Nikki Jackson'],
  ['Laura Brizell', 'Lance McIlvain', 'Scott Askelson', 'Ryan Millett', 'Kelly Nicholls', 'Devin Pflueger', 'Colton Moore', 'Nick Capouch', 'Steve Sanberg', 'Spenser Todd'],
  ['Morgan Carroll', 'Ty McFarland', 'Scott Brizell', 'Scott Askelson', 'Ryan Millett', 'Skyler Brady', 'Jason Simonton', 'Colton Moore', 'Stetson Christensen', 'Deklon Brady'],
  ['Rene Anderson', 'Morgan Carroll', 'Jason Simonton', 'Nick Capouch', 'Skyler Brady', 'Laura Brizell', 'Cole Jackson', 'Ryan Kearney', 'Chad Jones', 'Stetson Christensen'],
  ['Braylon Brady', 'Jason Simonton', 'Collin Strawn', 'Deklon Brady', 'Spenser Todd', 'Morgan Carroll', 'Camden Jackson', 'Gunnar Gregory', 'Tommy Thacker', 'Karen McIlvain'],
  ['Tommy Thacker', 'Jaycek Jackson', 'Skyler Brady', 'Ty McFarland', 'Nikki Jackson', 'Tommy Thacker', 'Morgan Carroll', 'Scott Brizell', 'Tuff Brady', 'Jeremy Dearborn'],
  ['Shelby Moore', 'Skyler Brady', 'Braylon Brady', 'Tommy Thacker', 'Rene Anderson', 'Stetson Christensen', 'Sarah McFarland', 'Stetson Christensen', 'Morgan Carroll', 'Eric Moore'],
];

// Digit order for the grid axes (randomized at pool start)
// columnDigits[i] = the winner's digit label for grid column i
// rowDigits[i] = the loser's digit label for grid row i
export const DEFAULT_COLUMN_DIGITS = [3, 0, 1, 8, 9, 4, 5, 6, 7, 2];
export const DEFAULT_ROW_DIGITS = [7, 5, 3, 4, 0, 6, 9, 2, 1, 8];

export const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;

// ESPN API endpoint for NCAA Men's Basketball
export const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Confetti-worthy rounds
export const CONFETTI_ROUNDS: RoundNumber[] = [8, 4, 2];
