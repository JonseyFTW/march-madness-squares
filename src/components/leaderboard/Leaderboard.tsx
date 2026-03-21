import { useMemo, useState } from 'react';
import { Game } from '../../types';
import { calculateParticipants, exportLeaderboardCSV } from '../../utils/participantUtils';
import { BUY_IN } from '../../data/constants';
import { Download, ChevronDown, ChevronRight, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LeaderboardProps {
  grid: string[][];
  games: Game[];
  columnDigits: number[];
  rowDigits: number[];
}

const BAR_COLORS = ['#f59e0b', '#9ca3af', '#b45309', '#6366f1', '#22c55e', '#ec4899', '#14b8a6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function Leaderboard({ grid, games, columnDigits, rowDigits }: LeaderboardProps) {
  const participants = useMemo(() => calculateParticipants(grid, games), [grid, games]);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const chartData = useMemo(
    () => participants.filter(p => p.totalWinnings > 0).map(p => ({ name: p.name.split(' ')[0], winnings: p.totalWinnings })),
    [participants]
  );

  const handleExport = () => {
    const csv = exportLeaderboardCSV(participants);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'march-madness-leaderboard-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white tracking-tight">LEADERBOARD</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-semibold text-gray-300 transition"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Earnings Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                formatter={(value: any) => [`$${value}`, 'Winnings']}
              />
              <Bar dataKey="winnings" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-4 py-2 text-xs font-bold text-gray-400 border-b border-gray-700/50 bg-gray-800">
          <span className="w-8 text-center">#</span>
          <span>Name</span>
          <span className="text-center w-16">Squares</span>
          <span className="text-center w-12">Wins</span>
          <span className="text-right w-20">Winnings</span>
          <span className="text-right w-16">ROI</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-700/30">
          {participants.map((p, i) => {
            const isExpanded = expandedPerson === p.name;
            const investment = p.squareCount * BUY_IN;
            const isPositive = p.totalWinnings > investment;
            const isBreakEven = p.totalWinnings === investment;

            return (
              <div key={p.name}>
                <button
                  onClick={() => setExpandedPerson(isExpanded ? null : p.name)}
                  className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-4 py-3 items-center hover:bg-gray-700/20 transition text-left"
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${
                    i === 0 ? 'bg-amber-500 text-black' :
                    i === 1 ? 'bg-gray-400 text-black' :
                    i === 2 ? 'bg-amber-700 text-white' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {i + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                  </div>

                  <span className="text-sm text-gray-300 text-center w-16">{p.squareCount}</span>
                  <span className="text-sm text-gray-300 text-center w-12">{p.wins}</span>
                  <span className="text-sm font-bold text-green-400 text-right w-20">
                    ${p.totalWinnings}
                  </span>
                  <span className={`text-sm font-semibold text-right w-16 flex items-center justify-end gap-1 ${
                    isPositive ? 'text-green-400' : isBreakEven ? 'text-gray-400' : 'text-red-400'
                  }`}>
                    {isPositive ? <TrendingUp size={12} /> : !isBreakEven ? <TrendingDown size={12} /> : null}
                    {p.roi > 0 ? '+' : ''}{p.roi.toFixed(0)}%
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 bg-gray-700/10">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-700/30 rounded-lg p-2">
                        <span className="text-gray-400">Investment</span>
                        <div className="text-white font-bold">${investment}</div>
                      </div>
                      <div className="bg-gray-700/30 rounded-lg p-2">
                        <span className="text-gray-400">Net Profit</span>
                        <div className={`font-bold ${p.totalWinnings - investment >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {p.totalWinnings - investment >= 0 ? '+' : ''}${p.totalWinnings - investment}
                        </div>
                      </div>
                      {Object.entries(p.roundBreakdown).map(([round, amount]) => (
                        <div key={round} className="bg-gray-700/30 rounded-lg p-2">
                          <span className="text-gray-400">{round}</span>
                          <div className="text-green-400 font-bold">${amount}</div>
                        </div>
                      ))}
                    </div>
                    {p.squares.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-400">Squares: </span>
                        <span className="text-xs text-gray-300">
                          {p.squares.map(s => `(${columnDigits[s.col]},${rowDigits[s.row]})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
