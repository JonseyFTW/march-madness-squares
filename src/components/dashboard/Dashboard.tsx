import { useMemo } from 'react';
import { Game } from '../../types';
import { TOTAL_POT, ROUNDS, getRoundName } from '../../data/constants';
import { getTotalPaidOut, getCurrentRound, getCompletedGamesCount, digitToGridIndex } from '../../utils/gameUtils';
import { calculateParticipants } from '../../utils/participantUtils';
import { DollarSign, TrendingUp, Trophy, Zap, Clock, Target } from 'lucide-react';

interface DashboardProps {
  grid: string[][];
  games: Game[];
  columnDigits: number[];
  rowDigits: number[];
  onNavigate: (tab: string, highlight?: { row: number; col: number }) => void;
}

export default function Dashboard({ grid, games, columnDigits, rowDigits, onNavigate }: DashboardProps) {
  const totalPaid = useMemo(() => getTotalPaidOut(games), [games]);
  const currentRound = useMemo(() => getCurrentRound(games), [games]);
  const completedCounts = useMemo(() => getCompletedGamesCount(games), [games]);
  const participants = useMemo(() => calculateParticipants(grid, games), [grid, games]);
  const finalGames = useMemo(
    () => games.filter(g => g.status === 'final' && g.round !== 68).sort((a, b) => {
      const roundOrder = [2, 4, 8, 16, 32, 64];
      return roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round) || b.gameNumber - a.gameNumber;
    }),
    [games]
  );
  const inProgressGames = useMemo(() => games.filter(g => g.status === 'in_progress'), [games]);

  const recentWinners = finalGames.slice(0, 5);
  const topEarners = participants.slice(0, 5);

  // Digit frequency
  const digitStats = useMemo(() => {
    const winning = Array(10).fill(0);
    const losing = Array(10).fill(0);
    for (const g of finalGames) {
      if (g.winningDigit != null) winning[g.winningDigit]++;
      if (g.losingDigit != null) losing[g.losingDigit]++;
    }
    return { winning, losing };
  }, [finalGames]);

  const hotDigit = digitStats.winning.indexOf(Math.max(...digitStats.winning));
  const hotDigitLosing = digitStats.losing.indexOf(Math.max(...digitStats.losing));

  // Round progress
  const roundInfo = ROUNDS.find(r => r.round === currentRound);
  const currentRoundCompleted = completedCounts[currentRound] || 0;
  const currentRoundTotal = roundInfo?.totalGames || 1;
  const progressPct = (currentRoundCompleted / currentRoundTotal) * 100;

  const totalGamesPlayed = Object.values(completedCounts).reduce((a, b) => a + b, 0);
  const totalGamesInPool = 63; // 32+16+8+4+2+1

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<DollarSign />} label="Total Pot" value={`$${TOTAL_POT.toLocaleString()}`} color="orange" />
        <StatCard icon={<TrendingUp />} label="Paid Out" value={`$${totalPaid.toLocaleString()}`} color="green" />
        <StatCard icon={<Target />} label="Remaining" value={`$${(TOTAL_POT - totalPaid).toLocaleString()}`} color="blue" />
        <StatCard icon={<Zap />} label="Games Played" value={`${totalGamesPlayed} / ${totalGamesInPool}`} color="purple" />
      </div>

      {/* Current Round Progress */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-400" />
            <span className="text-sm font-bold text-white">
              Current Round: {getRoundName(currentRound)}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {currentRoundCompleted} / {currentRoundTotal} games
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          {ROUNDS.map(r => (
            <span
              key={r.round}
              className={r.round === currentRound ? 'text-orange-400 font-bold' : ''}
            >
              {r.name.replace('Round of ', 'R')}
            </span>
          ))}
        </div>
      </div>

      {/* Live games indicator */}
      {inProgressGames.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-400">LIVE GAMES</span>
          </div>
          <div className="space-y-2">
            {inProgressGames.map(g => (
              <div key={g.id} className="flex items-center justify-between gap-4 text-sm bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="text-white font-semibold">
                  {g.topTeam || 'TBD'} vs {g.bottomTeam || 'TBD'}
                </span>
                <div className="text-right whitespace-nowrap">
                  {(g.period || g.displayClock) && (
                    <div className="text-xs text-red-400 font-medium">
                      {g.statusDetail === 'Halftime' ? 'HT' : (
                        [
                          g.period && (g.period <= 2 ? `${g.period}H` : `OT${g.period > 3 ? g.period - 2 : ''}`),
                          g.displayClock,
                        ].filter(Boolean).join(' - ')
                      )}
                    </div>
                  )}
                  <span className="text-gray-400">
                    {g.topTeamScore ?? '—'} - {g.bottomTeamScore ?? '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 min-w-0">
        {/* Recent Winners */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy size={16} className="text-orange-400" />
              Recent Winners
            </h3>
            <button
              onClick={() => onNavigate('games')}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              View All →
            </button>
          </div>

          {recentWinners.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No games completed yet.</p>
          ) : (
            <div className="space-y-2">
              {recentWinners.map(g => (
                <div
                  key={g.id}
                  className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700/50 transition"
                  onClick={() => {
                    if (g.losingDigit != null && g.winningDigit != null) {
                      onNavigate('board', {
                        row: digitToGridIndex(g.losingDigit, rowDigits),
                        col: digitToGridIndex(g.winningDigit, columnDigits),
                      });
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{getRoundName(g.round)}</div>
                    <div className="text-sm text-white font-semibold truncate">
                      {g.winningTeam} {Math.max(g.topTeamScore!, g.bottomTeamScore!)} - {g.losingTeam} {Math.min(g.topTeamScore!, g.bottomTeamScore!)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Square ({g.winningDigit}, {g.losingDigit}) → <span className="text-orange-400 font-semibold">{g.squareWinner}</span>
                    </div>
                  </div>
                  <div className="text-green-400 font-black text-sm ml-3">
                    +${g.payout}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Earners */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              Top Earners
            </h3>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              Full Leaderboard →
            </button>
          </div>

          {topEarners.length === 0 || topEarners[0].totalWinnings === 0 ? (
            <p className="text-sm text-gray-500 italic">No winnings recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topEarners.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                      i === 0 ? 'bg-amber-500 text-black' :
                      i === 1 ? 'bg-gray-400 text-black' :
                      i === 2 ? 'bg-amber-700 text-white' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm text-white font-semibold">{p.name}</div>
                      <div className="text-xs text-gray-400">
                        {p.wins} win{p.wins !== 1 ? 's' : ''} · {p.squareCount} square{p.squareCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-green-400 font-black text-sm">${p.totalWinnings}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hot/Cold Numbers */}
      {totalGamesPlayed > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-sm font-bold text-white mb-3">Digit Frequency (Winning Team)</h3>
            <div className="grid grid-cols-10 gap-2">
              {digitStats.winning.map((count, digit) => {
                const maxCount = Math.max(...digitStats.winning, 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={digit} className="flex flex-col items-center gap-1">
                    <div className="w-full h-16 bg-gray-700/50 rounded relative overflow-hidden">
                      <div
                        className={`absolute bottom-0 w-full rounded transition-all duration-500 ${
                          digit === hotDigit ? 'bg-orange-500' : 'bg-blue-500/60'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-300">{digit}</span>
                    <span className="text-[10px] text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-sm font-bold text-white mb-3">Digit Frequency (Losing Team)</h3>
            <div className="grid grid-cols-10 gap-2">
              {digitStats.losing.map((count, digit) => {
                const maxCount = Math.max(...digitStats.losing, 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={digit} className="flex flex-col items-center gap-1">
                    <div className="w-full h-16 bg-gray-700/50 rounded relative overflow-hidden">
                      <div
                        className={`absolute bottom-0 w-full rounded transition-all duration-500 ${
                          digit === hotDigitLosing ? 'bg-orange-500' : 'bg-red-500/60'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-300">{digit}</span>
                    <span className="text-[10px] text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4`}>
      <div className={`mb-2 ${colorMap[color].split(' ').pop()}`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}
