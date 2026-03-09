import { useState } from 'react';
import { Game, RoundNumber } from '../../types';
import { Lock, Unlock, Grid3X3, Plus, Trash2, RefreshCw, AlertTriangle, Calculator } from 'lucide-react';

interface AdminPanelProps {
  grid: string[][];
  games: Game[];
  isAdmin: boolean;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
  onUpdateGrid: (grid: string[][]) => void;
  onUpdateGame: (gameId: string, updates: Partial<Game>) => void;
  onAddGame: (game: Game) => void;
  onRecalculate: () => void;
  onResetGames: () => void;
}

export default function AdminPanel({
  grid,
  games,
  isAdmin,
  onLogin,
  onLogout,
  onUpdateGrid,
  onUpdateGame,
  onAddGame,
  onRecalculate,
  onResetGames,
}: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [activeSection, setActiveSection] = useState<'grid' | 'quickEntry' | 'tools'>('quickEntry');

  // Quick game entry
  const [quickRound, setQuickRound] = useState<RoundNumber>(64);
  const [quickTeam1, setQuickTeam1] = useState('');
  const [quickTeam2, setQuickTeam2] = useState('');
  const [quickScore1, setQuickScore1] = useState('');
  const [quickScore2, setQuickScore2] = useState('');
  const [quickMessage, setQuickMessage] = useState('');

  // What-if calculator
  const [whatIfScore1, setWhatIfScore1] = useState('');
  const [whatIfScore2, setWhatIfScore2] = useState('');
  const [whatIfResult, setWhatIfResult] = useState('');

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 text-center">
          <Lock size={48} className="mx-auto text-gray-500 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Admin Access</h2>
          <p className="text-sm text-gray-400 mb-4">Enter the admin password to manage games and settings.</p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const ok = onLogin(password);
              if (!ok) setLoginError(true);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError(false); }}
              placeholder="Password"
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 border border-gray-600 focus:border-orange-400 outline-none"
            />
            {loginError && <p className="text-red-400 text-xs">Incorrect password.</p>}
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleQuickAdd = () => {
    if (!quickTeam1 || !quickTeam2) {
      setQuickMessage('Enter both team names.');
      return;
    }

    const roundGames = games.filter(g => g.round === quickRound);
    // Find an empty upcoming game slot, or create a new one
    const emptySlot = roundGames.find(g => g.status === 'upcoming' && !g.topTeam && !g.bottomTeam);

    const updates: Partial<Game> = {
      topTeam: quickTeam1,
      bottomTeam: quickTeam2,
      topTeamScore: quickScore1 ? parseInt(quickScore1) : undefined,
      bottomTeamScore: quickScore2 ? parseInt(quickScore2) : undefined,
      status: quickScore1 && quickScore2 ? 'final' : 'upcoming',
    };

    if (emptySlot) {
      onUpdateGame(emptySlot.id, updates);
      setQuickMessage(`Updated game ${emptySlot.id}: ${quickTeam1} vs ${quickTeam2}`);
    } else {
      const newGame: Game = {
        id: `${quickRound}-${Date.now()}`,
        round: quickRound,
        gameNumber: roundGames.length + 1,
        topTeam: quickTeam1,
        bottomTeam: quickTeam2,
        topTeamScore: quickScore1 ? parseInt(quickScore1) : undefined,
        bottomTeamScore: quickScore2 ? parseInt(quickScore2) : undefined,
        status: quickScore1 && quickScore2 ? 'final' : 'upcoming',
      };
      onAddGame(newGame);
      setQuickMessage(`Added new game: ${quickTeam1} vs ${quickTeam2}`);
    }

    setQuickTeam1('');
    setQuickTeam2('');
    setQuickScore1('');
    setQuickScore2('');
  };

  const handleWhatIf = () => {
    const s1 = parseInt(whatIfScore1);
    const s2 = parseInt(whatIfScore2);
    if (isNaN(s1) || isNaN(s2)) {
      setWhatIfResult('Enter valid scores.');
      return;
    }
    const winDigit = Math.max(s1, s2) % 10;
    const loseDigit = Math.min(s1, s2) % 10;
    const winner = grid[loseDigit]?.[winDigit] || 'Unassigned';
    setWhatIfResult(`Score ${Math.max(s1, s2)}-${Math.min(s1, s2)} → Winner digit: ${winDigit}, Loser digit: ${loseDigit} → Square owner: ${winner}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Unlock size={20} className="text-green-400" />
          ADMIN PANEL
        </h2>
        <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white transition">
          Lock
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        {[
          { id: 'quickEntry' as const, label: 'Quick Entry', icon: <Plus size={14} /> },
          { id: 'grid' as const, label: 'Edit Grid', icon: <Grid3X3 size={14} /> },
          { id: 'tools' as const, label: 'Tools', icon: <Calculator size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSection === tab.id
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Quick Entry */}
      {activeSection === 'quickEntry' && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
          <h3 className="text-sm font-bold text-white">Quick Game Entry</h3>
          <p className="text-xs text-gray-400">Add a game result quickly. If there's an empty slot in the round, it will be filled. Otherwise a new game is created.</p>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={quickRound}
              onChange={e => setQuickRound(parseInt(e.target.value) as RoundNumber)}
              className="col-span-2 bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 outline-none"
            >
              <option value={64}>Round of 64</option>
              <option value={32}>Round of 32</option>
              <option value={16}>Sweet 16</option>
              <option value={8}>Elite 8</option>
              <option value={4}>Final Four</option>
              <option value={2}>Championship</option>
            </select>
            <input
              type="text"
              value={quickTeam1}
              onChange={e => setQuickTeam1(e.target.value)}
              placeholder="Team 1 (higher seed)"
              className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-400 outline-none"
            />
            <input
              type="text"
              value={quickTeam2}
              onChange={e => setQuickTeam2(e.target.value)}
              placeholder="Team 2"
              className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-400 outline-none"
            />
            <input
              type="number"
              value={quickScore1}
              onChange={e => setQuickScore1(e.target.value)}
              placeholder="Score 1 (optional)"
              className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-400 outline-none"
            />
            <input
              type="number"
              value={quickScore2}
              onChange={e => setQuickScore2(e.target.value)}
              placeholder="Score 2 (optional)"
              className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-400 outline-none"
            />
          </div>

          <button
            onClick={handleQuickAdd}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition text-sm"
          >
            Add / Update Game
          </button>

          {quickMessage && (
            <p className="text-xs text-green-400">{quickMessage}</p>
          )}
        </div>
      )}

      {/* Grid Editor */}
      {activeSection === 'grid' && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
          <h3 className="text-sm font-bold text-white">Edit Square Assignments</h3>
          <p className="text-xs text-gray-400">Edit the 10×10 grid. Rows = Loser's last digit, Columns = Winner's last digit.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-gray-500"></th>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th key={i} className="p-1 text-orange-400 font-bold">{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    <td className="p-1 text-orange-400 font-bold text-center">{ri}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-0.5">
                        <input
                          type="text"
                          value={cell}
                          onChange={e => {
                            const newGrid = grid.map(r => [...r]);
                            newGrid[ri][ci] = e.target.value;
                            onUpdateGrid(newGrid);
                          }}
                          className="w-full bg-gray-700 text-white text-[10px] rounded px-1 py-1 border border-gray-600 focus:border-orange-400 outline-none min-w-[80px]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tools */}
      {activeSection === 'tools' && (
        <div className="space-y-4">
          {/* What-If Calculator */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator size={16} className="text-blue-400" />
              What-If Calculator
            </h3>
            <p className="text-xs text-gray-400">Enter hypothetical scores to see which square would win.</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={whatIfScore1}
                onChange={e => setWhatIfScore1(e.target.value)}
                placeholder="Winner score"
                className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-blue-400 outline-none"
              />
              <input
                type="number"
                value={whatIfScore2}
                onChange={e => setWhatIfScore2(e.target.value)}
                placeholder="Loser score"
                className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-blue-400 outline-none"
              />
            </div>
            <button onClick={handleWhatIf} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition text-sm w-full">
              Calculate
            </button>
            {whatIfResult && <p className="text-xs text-blue-300">{whatIfResult}</p>}
          </div>

          {/* Danger Zone */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-red-500/20 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onRecalculate}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <RefreshCw size={14} />
                Recalculate All Games
              </button>
              <button
                onClick={() => {
                  if (confirm('Reset ALL game data? This cannot be undone.')) {
                    onResetGames();
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <Trash2 size={14} />
                Reset All Games
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
