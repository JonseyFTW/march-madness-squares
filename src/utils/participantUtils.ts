import { Game, Participant } from '../types';
import { BUY_IN, ROUND_NAMES, getRoundName } from '../data/constants';

export function calculateParticipants(grid: string[][], games: Game[]): Participant[] {
  const participantMap = new Map<string, Participant>();

  // Count squares per person
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const name = grid[row][col];
      if (!name) continue;

      if (!participantMap.has(name)) {
        participantMap.set(name, {
          name,
          squareCount: 0,
          totalWinnings: 0,
          wins: 0,
          roundBreakdown: {},
          roi: 0,
          squares: [],
        });
      }

      const p = participantMap.get(name)!;
      p.squareCount++;
      p.squares.push({ row, col });
    }
  }

  // Calculate winnings from games
  for (const game of games) {
    if (game.status !== 'final' || game.round === 68) continue;

    if (game.squareWinner && game.payout) {
      const name = game.squareWinner;
      if (name && name !== 'Unassigned') {
        if (!participantMap.has(name)) {
          participantMap.set(name, {
            name,
            squareCount: 0,
            totalWinnings: 0,
            wins: 0,
            roundBreakdown: {},
            roi: 0,
            squares: [],
          });
        }
        const p = participantMap.get(name)!;
        p.totalWinnings += game.payout;
        p.wins++;
        const roundName = getRoundName(game.round);
        p.roundBreakdown[roundName] = (p.roundBreakdown[roundName] || 0) + game.payout;
      }
    }

    // Championship wrong way
    if (game.wrongWaySquareWinner && game.wrongWayPayout) {
      const name = game.wrongWaySquareWinner;
      if (name && name !== 'Unassigned') {
        if (!participantMap.has(name)) {
          participantMap.set(name, {
            name,
            squareCount: 0,
            totalWinnings: 0,
            wins: 0,
            roundBreakdown: {},
            roi: 0,
            squares: [],
          });
        }
        const p = participantMap.get(name)!;
        p.totalWinnings += game.wrongWayPayout;
        p.wins++;
        const key = 'Championship (Wrong Way)';
        p.roundBreakdown[key] = (p.roundBreakdown[key] || 0) + game.wrongWayPayout;
      }
    }
  }

  // Calculate ROI
  for (const p of participantMap.values()) {
    const investment = p.squareCount * BUY_IN;
    p.roi = investment > 0 ? ((p.totalWinnings - investment) / investment) * 100 : 0;
  }

  return Array.from(participantMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
}

export function exportLeaderboardCSV(participants: Participant[]): string {
  const headers = ['Rank', 'Name', 'Squares', 'Wins', 'Total Winnings', 'Investment', 'ROI'];
  const rows = participants.map((p, i) => [
    i + 1,
    p.name,
    p.squareCount,
    p.wins,
    `$${p.totalWinnings}`,
    `$${p.squareCount * BUY_IN}`,
    `${p.roi.toFixed(1)}%`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
