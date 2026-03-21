import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import SquareGrid from './components/board/SquareGrid';
import GamesView from './components/games/GamesView';
import Leaderboard from './components/leaderboard/Leaderboard';
import AdminPanel from './components/admin/AdminPanel';
import { useAppState } from './hooks/useAppState';
import { useESPNSync } from './hooks/useESPNSync';
import { CONFETTI_ROUNDS } from './data/constants';
import { Game, RoundNumber } from './types';

type Tab = 'dashboard' | 'board' | 'games' | 'leaderboard' | 'admin';

function App() {
  const {
    state,
    isAdmin,
    isLoading,
    dbConnected,
    updateGrid,
    updateDigitOrder,
    updateGame,
    addGame,
    removeGame,
    recalculateAllGames,
    resetGames,
    syncGames,
    login,
    logout,
  } = useAppState();

  const espnSync = useESPNSync({
    games: state.games,
    grid: state.grid,
    columnDigits: state.columnDigits,
    rowDigits: state.rowDigits,
    onSyncGames: syncGames,
  });

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [highlightSquare, setHighlightSquare] = useState<{ row: number; col: number } | null>(null);
  const prevGamesRef = useRef<string>('');

  // Watch for new final games to trigger confetti
  useEffect(() => {
    const finalGames = state.games.filter(g => g.status === 'final').map(g => g.id).join(',');
    if (prevGamesRef.current && finalGames !== prevGamesRef.current) {
      const prevIds = new Set(prevGamesRef.current.split(','));
      const newFinal = state.games.find(g => g.status === 'final' && !prevIds.has(g.id));
      if (newFinal && CONFETTI_ROUNDS.includes(newFinal.round as RoundNumber)) {
        fireConfetti();
      }
    }
    prevGamesRef.current = finalGames;
  }, [state.games]);

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const handleNavigate = useCallback((tab: string, highlight?: { row: number; col: number }) => {
    setActiveTab(tab as Tab);
    if (highlight) {
      setHighlightSquare(highlight);
      setTimeout(() => setHighlightSquare(null), 5000);
    }
  }, []);

  const handleUpdateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    updateGame(gameId, updates);
  }, [updateGame]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <Header activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

      <main className="max-w-7xl mx-auto px-4 py-6 relative">
        {activeTab === 'dashboard' && (
          <Dashboard grid={state.grid} games={state.games} columnDigits={state.columnDigits} rowDigits={state.rowDigits} onNavigate={handleNavigate} />
        )}
        {activeTab === 'board' && (
          <SquareGrid grid={state.grid} games={state.games} columnDigits={state.columnDigits} rowDigits={state.rowDigits} highlightSquare={highlightSquare} />
        )}
        {activeTab === 'games' && (
          <GamesView
            games={state.games}
            grid={state.grid}
            columnDigits={state.columnDigits}
            rowDigits={state.rowDigits}
            isAdmin={isAdmin}
            onUpdateGame={handleUpdateGame}
            onAddGame={addGame}
            onRemoveGame={removeGame}
            espnSync={espnSync}
          />
        )}
        {activeTab === 'leaderboard' && (
          <Leaderboard grid={state.grid} games={state.games} columnDigits={state.columnDigits} rowDigits={state.rowDigits} />
        )}
        {activeTab === 'admin' && (
          <AdminPanel
            grid={state.grid}
            games={state.games}
            columnDigits={state.columnDigits}
            rowDigits={state.rowDigits}
            isAdmin={isAdmin}
            onLogin={login}
            onLogout={logout}
            onUpdateGrid={updateGrid}
            onUpdateDigitOrder={updateDigitOrder}
            onUpdateGame={handleUpdateGame}
            onAddGame={addGame}
            onRecalculate={recalculateAllGames}
            onResetGames={resetGames}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 pb-6 text-center text-xs text-gray-600">
          <p>March Madness Squares Pool Tracker 2026</p>
          <p className="mt-1">
            Last updated: {new Date(state.lastUpdated).toLocaleString()}
            {dbConnected && <span className="ml-2 text-green-500" title="Connected to database">&#x25CF; Synced</span>}
            {!dbConnected && !isLoading && <span className="ml-2 text-yellow-500" title="Using local storage only">&#x25CF; Local</span>}
          </p>
        </footer>
      </main>
      <Analytics />
    </div>
  );
}

export default App;
