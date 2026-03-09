import { useState, useMemo } from 'react';
import { Game } from '../../types';
import { X } from 'lucide-react';

interface SquareGridProps {
  grid: string[][];
  games: Game[];
  highlightSquare?: { row: number; col: number } | null;
}

function getWinningsPerSquare(games: Game[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const game of games) {
    if (game.status !== 'final' || game.winningDigit == null || game.losingDigit == null) continue;
    const key = `${game.losingDigit}-${game.winningDigit}`;
    map.set(key, (map.get(key) || 0) + (game.payout || 0));
    if (game.round === 2 && game.wrongWayPayout) {
      const wrongKey = `${game.winningDigit}-${game.losingDigit}`;
      map.set(wrongKey, (map.get(wrongKey) || 0) + game.wrongWayPayout);
    }
  }
  return map;
}

function getDigitFrequency(games: Game[]): { winning: number[]; losing: number[] } {
  const winning = Array(10).fill(0);
  const losing = Array(10).fill(0);
  for (const game of games) {
    if (game.status === 'final' && game.winningDigit != null && game.losingDigit != null) {
      winning[game.winningDigit]++;
      losing[game.losingDigit]++;
    }
  }
  return { winning, losing };
}

function getHeatColor(amount: number, max: number): string {
  if (amount === 0) return '';
  const intensity = Math.min(amount / Math.max(max, 1), 1);
  if (intensity < 0.25) return 'bg-green-900/30';
  if (intensity < 0.5) return 'bg-green-800/40';
  if (intensity < 0.75) return 'bg-green-600/30';
  return 'bg-green-500/30';
}

export default function SquareGrid({ grid, games, highlightSquare }: SquareGridProps) {
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [showHeatMap, setShowHeatMap] = useState(true);

  const winningsMap = useMemo(() => getWinningsPerSquare(games), [games]);
  const maxWinnings = useMemo(() => Math.max(...winningsMap.values(), 1), [winningsMap]);
  const digitFreq = useMemo(() => getDigitFrequency(games), [games]);

  const selectedWins = useMemo(() => {
    if (!selectedSquare) return [];
    return games.filter(g => {
      if (g.status !== 'final') return false;
      const isRightWay = g.losingDigit === selectedSquare.row && g.winningDigit === selectedSquare.col;
      const isWrongWay = g.round === 2 && g.winningDigit === selectedSquare.row && g.losingDigit === selectedSquare.col;
      return isRightWay || isWrongWay;
    });
  }, [selectedSquare, games]);

  const totalGames = games.filter(g => g.status === 'final' && g.round !== 68).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white tracking-tight">THE BOARD</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeatMap}
              onChange={() => setShowHeatMap(!showHeatMap)}
              className="accent-orange-500"
            />
            Heat Map
          </label>
        </div>
      </div>

      {/* Digit frequency bar */}
      {totalGames > 0 && (
        <div className="grid grid-cols-10 gap-1 text-center">
          {digitFreq.winning.map((count, i) => (
            <div key={i} className="text-[10px] text-gray-500">
              <div
                className="bg-orange-500/30 rounded-sm mx-auto mb-0.5"
                style={{ height: `${Math.max((count / Math.max(totalGames, 1)) * 30, 2)}px`, width: '100%' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Column header label */}
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
              Winner's Last Digit
            </span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'auto repeat(10, 1fr)', gridTemplateRows: 'auto repeat(10, 1fr)' }}>
            {/* Top-left corner */}
            <div className="p-1" />

            {/* Column headers */}
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={`col-${i}`}
                className="flex items-center justify-center p-2 text-sm font-black text-orange-400 bg-gray-800/50 first:rounded-tl-lg last:rounded-tr-lg"
              >
                {i}
              </div>
            ))}

            {/* Grid rows */}
            {Array.from({ length: 10 }, (_, row) => (
              <>
                {/* Row header */}
                <div
                  key={`row-${row}`}
                  className="flex items-center justify-center p-2 text-sm font-black text-orange-400 bg-gray-800/50"
                >
                  <div className="flex flex-col items-center">
                    <span>{row}</span>
                    {row === 0 && (
                      <span className="text-[8px] font-normal text-gray-500 -rotate-90 absolute -left-8 hidden lg:block">
                        LOSER
                      </span>
                    )}
                  </div>
                </div>

                {/* Squares */}
                {Array.from({ length: 10 }, (_, col) => {
                  const owner = grid[row]?.[col] || '';
                  const squareNum = row * 10 + col + 1;
                  const key = `${row}-${col}`;
                  const winnings = winningsMap.get(key) || 0;
                  const isHighlighted = highlightSquare?.row === row && highlightSquare?.col === col;
                  const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
                  const hasWon = winnings > 0;
                  const heatColor = showHeatMap ? getHeatColor(winnings, maxWinnings) : '';

                  return (
                    <button
                      key={`cell-${row}-${col}`}
                      onClick={() => setSelectedSquare(isSelected ? null : { row, col })}
                      className={`
                        relative border border-gray-700/50 p-1.5 text-center transition-all duration-300 cursor-pointer
                        min-h-[60px] flex flex-col items-center justify-center gap-0.5
                        hover:border-orange-400/50 hover:z-10 hover:scale-105
                        ${heatColor}
                        ${isHighlighted ? 'ring-2 ring-orange-400 animate-pulse bg-orange-500/20 z-20 scale-105' : ''}
                        ${isSelected ? 'ring-2 ring-blue-400 bg-blue-500/10 z-20' : ''}
                        ${hasWon && !isHighlighted ? 'border-green-600/40' : ''}
                        ${!owner ? 'bg-gray-800/30' : ''}
                      `}
                    >
                      <span className="text-[9px] text-gray-600 font-mono absolute top-0.5 left-1">
                        {squareNum}
                      </span>
                      <span className={`text-[11px] font-semibold leading-tight ${owner ? 'text-gray-200' : 'text-gray-600'}`}>
                        {owner || '—'}
                      </span>
                      {winnings > 0 && (
                        <span className="text-[9px] font-bold text-green-400">
                          ${winnings}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ))}
          </div>

          {/* Row header label */}
          <div className="text-center mt-1">
            <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
              Loser's Last Digit (rows) — Winner's Last Digit (columns)
            </span>
          </div>
        </div>
      </div>

      {/* Selected square detail */}
      {selectedSquare && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">
              Square #{selectedSquare.row * 10 + selectedSquare.col + 1} — {grid[selectedSquare.row]?.[selectedSquare.col] || 'Unassigned'}
            </h3>
            <button onClick={() => setSelectedSquare(null)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            Winner digit: {selectedSquare.col} / Loser digit: {selectedSquare.row}
          </p>

          {selectedWins.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No wins yet for this square.</p>
          ) : (
            <div className="space-y-1">
              {selectedWins.map(g => (
                <div key={g.id} className="flex items-center justify-between text-xs bg-gray-700/50 rounded px-2 py-1">
                  <span className="text-gray-300">
                    {g.winningTeam} {g.topTeamScore != null ? `${Math.max(g.topTeamScore, g.bottomTeamScore!)}` : ''}-
                    {g.losingTeam} {g.topTeamScore != null ? `${Math.min(g.topTeamScore, g.bottomTeamScore!)}` : ''}
                  </span>
                  <span className="text-green-400 font-bold">
                    ${g.losingDigit === selectedSquare.row && g.winningDigit === selectedSquare.col ? g.payout : g.wrongWayPayout}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
