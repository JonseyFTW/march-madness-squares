import { Game, RoundNumber } from '../types';
import { getPayoutForRound, CHAMPIONSHIP_RIGHT_WAY, CHAMPIONSHIP_WRONG_WAY } from '../data/constants';

export function getLastDigit(score: number): number {
  return score % 10;
}

export function calculateGameResult(game: Game, grid: string[][]): Partial<Game> {
  if (game.topTeamScore == null || game.bottomTeamScore == null) return {};
  if (game.round === 68) return {}; // play-in games excluded

  const topScore = game.topTeamScore;
  const bottomScore = game.bottomTeamScore;

  const winningTeam = topScore > bottomScore ? game.topTeam : game.bottomTeam;
  const losingTeam = topScore > bottomScore ? game.bottomTeam : game.topTeam;
  const winningScore = Math.max(topScore, bottomScore);
  const losingScore = Math.min(topScore, bottomScore);

  const winningDigit = getLastDigit(winningScore);
  const losingDigit = getLastDigit(losingScore);

  const squareWinner = grid[losingDigit]?.[winningDigit] || 'Unassigned';

  let payout = getPayoutForRound(game.round);
  let wrongWaySquareWinner: string | undefined;
  let wrongWayPayout: number | undefined;

  if (game.round === 2) {
    payout = CHAMPIONSHIP_RIGHT_WAY;
    wrongWaySquareWinner = grid[winningDigit]?.[losingDigit] || 'Unassigned';
    wrongWayPayout = CHAMPIONSHIP_WRONG_WAY;
  }

  return {
    winningTeam,
    losingTeam,
    winningDigit,
    losingDigit,
    squareWinner,
    payout,
    wrongWaySquareWinner,
    wrongWayPayout,
    status: 'final' as const,
  };
}

export function generateDefaultGames(): Game[] {
  const games: Game[] = [];
  let id = 1;

  // Round of 64 - 32 games
  for (let i = 1; i <= 32; i++) {
    games.push({
      id: `R64-${id}`,
      round: 64,
      gameNumber: i,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    });
    id++;
  }

  // Round of 32 - 16 games
  for (let i = 1; i <= 16; i++) {
    games.push({
      id: `R32-${id}`,
      round: 32,
      gameNumber: i,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    });
    id++;
  }

  // Sweet 16 - 8 games
  for (let i = 1; i <= 8; i++) {
    games.push({
      id: `S16-${id}`,
      round: 16,
      gameNumber: i,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    });
    id++;
  }

  // Elite 8 - 4 games
  for (let i = 1; i <= 4; i++) {
    games.push({
      id: `E8-${id}`,
      round: 8,
      gameNumber: i,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    });
    id++;
  }

  // Final Four - 2 games
  for (let i = 1; i <= 2; i++) {
    games.push({
      id: `F4-${id}`,
      round: 4,
      gameNumber: i,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    });
    id++;
  }

  // Championship - 1 game
  games.push({
    id: `CHAMP-${id}`,
    round: 2,
    gameNumber: 1,
    topTeam: '',
    bottomTeam: '',
    status: 'upcoming',
  });

  return games;
}

export function getCompletedGamesCount(games: Game[]): Record<RoundNumber, number> {
  const counts: Record<number, number> = {};
  for (const game of games) {
    if (game.status === 'final' && game.round !== 68) {
      counts[game.round] = (counts[game.round] || 0) + 1;
    }
  }
  return counts as Record<RoundNumber, number>;
}

export function getTotalPaidOut(games: Game[]): number {
  let total = 0;
  for (const game of games) {
    if (game.status === 'final' && game.payout) {
      total += game.payout;
    }
    if (game.wrongWayPayout && game.status === 'final') {
      total += game.wrongWayPayout;
    }
  }
  return total;
}

export function getCurrentRound(games: Game[]): RoundNumber {
  const roundOrder: RoundNumber[] = [64, 32, 16, 8, 4, 2];
  for (const round of roundOrder) {
    const roundGames = games.filter(g => g.round === round);
    const hasIncomplete = roundGames.some(g => g.status !== 'final');
    if (hasIncomplete) return round;
  }
  return 2;
}
