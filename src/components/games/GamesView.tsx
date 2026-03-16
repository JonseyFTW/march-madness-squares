import { useState, useMemo } from 'react';
import { Game, RoundNumber } from '../../types';
import { ROUNDS, getRoundName, CHAMPIONSHIP_RIGHT_WAY, CHAMPIONSHIP_WRONG_WAY } from '../../data/constants';
import { ChevronDown, ChevronRight, Edit3, Check, X, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

interface ESPNSyncInfo {
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  liveCount: number;
  sync: () => Promise<void>;
}

interface GamesViewProps {
  games: Game[];
  grid: string[][];
  isAdmin: boolean;
  onUpdateGame: (gameId: string, updates: Partial<Game>) => void;
  onAddGame: (game: Game) => void;
  onRemoveGame: (gameId: string) => void;
  espnSync?: ESPNSyncInfo;
}

export default function GamesView({ games, grid, isAdmin, onUpdateGame, onAddGame, onRemoveGame, espnSync }: GamesViewProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([68, 64, 32, 16, 8, 4, 2]));
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Game>>({});

  const roundGroups = useMemo(() => {
    const groups = new Map<RoundNumber, Game[]>();
    const roundOrder: RoundNumber[] = [68, 64, 32, 16, 8, 4, 2];
    for (const r of roundOrder) {
      const roundGames = games.filter(g => g.round === r).sort((a, b) => a.gameNumber - b.gameNumber);
      if (roundGames.length > 0) {
        groups.set(r, roundGames);
      }
    }
    return groups;
  }, [games]);

  const toggleRound = (round: number) => {
    const next = new Set(expandedRounds);
    if (next.has(round)) next.delete(round);
    else next.add(round);
    setExpandedRounds(next);
  };

  const startEdit = (game: Game) => {
    setEditingGame(game.id);
    setEditForm({
      topTeam: game.topTeam,
      bottomTeam: game.bottomTeam,
      topTeamScore: game.topTeamScore,
      bottomTeamScore: game.bottomTeamScore,
      status: game.status,
    });
  };

  const saveEdit = (gameId: string) => {
    onUpdateGame(gameId, editForm);
    setEditingGame(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingGame(null);
    setEditForm({});
  };

  const addNewGame = (round: RoundNumber) => {
    const roundGames = games.filter(g => g.round === round);
    const nextNum = roundGames.length + 1;
    const newGame: Game = {
      id: `${round}-custom-${Date.now()}`,
      round,
      gameNumber: nextNum,
      topTeam: '',
      bottomTeam: '',
      status: 'upcoming',
    };
    onAddGame(newGame);
    startEdit(newGame);
  };

  return (
    <div className="space-y-4">
      {/* Header with sync status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white tracking-tight">GAMES & RESULTS</h2>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          {espnSync && espnSync.liveCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs font-bold text-red-400">{espnSync.liveCount} LIVE</span>
            </div>
          )}

          {/* Sync status */}
          {espnSync && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {espnSync.lastSync ? (
                <span className="flex items-center gap-1">
                  <Wifi size={12} className="text-green-500" />
                  {espnSync.lastSync.toLocaleTimeString()}
                </span>
              ) : espnSync.syncError ? (
                <span className="flex items-center gap-1 text-red-400">
                  <WifiOff size={12} />
                  Error
                </span>
              ) : null}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={() => espnSync?.sync()}
            disabled={espnSync?.isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition"
          >
            <RefreshCw size={14} className={espnSync?.isSyncing ? 'animate-spin' : ''} />
            {espnSync?.isSyncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Sync error */}
      {espnSync?.syncError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-300">
          {espnSync.syncError}
        </div>
      )}

      {/* Auto-refresh note */}
      {espnSync && espnSync.liveCount > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
          <Clock size={12} />
          Auto-refreshing every 30 seconds while games are live
        </div>
      )}

      {/* Round groups */}
      {Array.from(roundGroups.entries()).map(([round, roundGames]) => {
        const roundInfo = ROUNDS.find(r => r.round === round);
        const completedCount = roundGames.filter(g => g.status === 'final').length;
        const liveCount = roundGames.filter(g => g.status === 'in_progress').length;
        const isExpanded = expandedRounds.has(round);

        // Group by region if available
        const regions = new Set(roundGames.map(g => g.region).filter(Boolean));

        return (
          <div key={round} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
            <button
              onClick={() => toggleRound(round)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                <span className="text-sm font-bold text-white">{getRoundName(round as RoundNumber)}</span>
                {round !== 68 && (
                  <span className="text-xs text-gray-400">
                    ${roundInfo?.payoutPerGame}/game
                    {round === 2 && ` (Right: $${CHAMPIONSHIP_RIGHT_WAY}, Wrong: $${CHAMPIONSHIP_WRONG_WAY})`}
                  </span>
                )}
                {round === 68 && <span className="text-xs text-gray-500">Play-in (no payout)</span>}
              </div>
              <div className="flex items-center gap-2">
                {liveCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 animate-pulse">
                    {liveCount} LIVE
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  completedCount === roundGames.length && roundGames.length > 0
                    ? 'bg-green-500/20 text-green-400'
                    : completedCount > 0
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {completedCount}/{roundGames.length}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-700/50">
                {roundGames.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    No games added for this round yet.
                    {isAdmin && (
                      <button
                        onClick={() => addNewGame(round as RoundNumber)}
                        className="block mx-auto mt-2 text-orange-400 hover:text-orange-300 text-xs font-semibold"
                      >
                        + Add Game
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Group by region if we have region data */}
                    {regions.size > 1 ? (
                      Array.from(regions).sort().map(region => (
                        <div key={region}>
                          <div className="px-4 py-1.5 bg-gray-700/20 border-b border-gray-700/30">
                            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{region} Region</span>
                          </div>
                          <div className="divide-y divide-gray-700/30">
                            {roundGames.filter(g => g.region === region).map(game => (
                              <GameRow
                                key={game.id}
                                game={game}
                                isEditing={editingGame === game.id}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                isAdmin={isAdmin}
                                onStartEdit={() => startEdit(game)}
                                onSave={() => saveEdit(game.id)}
                                onCancel={cancelEdit}
                                onRemove={() => onRemoveGame(game.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="divide-y divide-gray-700/30">
                        {roundGames.map(game => (
                          <GameRow
                            key={game.id}
                            game={game}
                            isEditing={editingGame === game.id}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            isAdmin={isAdmin}
                            onStartEdit={() => startEdit(game)}
                            onSave={() => saveEdit(game.id)}
                            onCancel={cancelEdit}
                            onRemove={() => onRemoveGame(game.id)}
                          />
                        ))}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="px-4 py-2 border-t border-gray-700/30">
                        <button
                          onClick={() => addNewGame(round as RoundNumber)}
                          className="text-orange-400 hover:text-orange-300 text-xs font-semibold"
                        >
                          + Add Game
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GameRow({
  game,
  isEditing,
  editForm,
  setEditForm,
  isAdmin,
  onStartEdit,
  onSave,
  onCancel,
  onRemove,
}: {
  game: Game;
  isEditing: boolean;
  editForm: Partial<Game>;
  setEditForm: (f: Partial<Game>) => void;
  isAdmin: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  if (isEditing) {
    return (
      <div className="px-4 py-3 bg-gray-700/20 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={editForm.topTeam || ''}
            onChange={e => setEditForm({ ...editForm, topTeam: e.target.value })}
            placeholder="Team 1 (higher seed)"
            className="bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
          />
          <input
            type="text"
            value={editForm.bottomTeam || ''}
            onChange={e => setEditForm({ ...editForm, bottomTeam: e.target.value })}
            placeholder="Team 2"
            className="bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={editForm.topTeamScore ?? ''}
            onChange={e => setEditForm({ ...editForm, topTeamScore: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Score 1"
            className="bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
          />
          <input
            type="number"
            value={editForm.bottomTeamScore ?? ''}
            onChange={e => setEditForm({ ...editForm, bottomTeamScore: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Score 2"
            className="bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={editForm.status || 'upcoming'}
            onChange={e => setEditForm({ ...editForm, status: e.target.value as Game['status'] })}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 outline-none"
          >
            <option value="upcoming">Upcoming</option>
            <option value="in_progress">In Progress</option>
            <option value="final">Final</option>
          </select>
          <div className="flex-1" />
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-white transition">
            <X size={16} />
          </button>
          <button onClick={onSave} className="p-1.5 text-green-400 hover:text-green-300 transition">
            <Check size={16} />
          </button>
          <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-300 transition text-xs">
            Delete
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    upcoming: 'bg-gray-600 text-gray-300',
    in_progress: 'bg-red-500/20 text-red-400',
    final: 'bg-green-500/20 text-green-400',
  };

  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-700/20 transition group ${
      game.status === 'in_progress' ? 'bg-red-500/5 border-l-2 border-red-500' : ''
    }`}>
      <span className="text-xs text-gray-500 w-8 text-center font-mono">#{game.gameNumber}</span>

      <div className="flex-1 min-w-0">
        {/* Top team */}
        <div className="flex items-center gap-2">
          {game.topTeamSeed && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-700/50 rounded px-1 py-0.5 min-w-[20px] text-center">
              {game.topTeamSeed}
            </span>
          )}
          <span className={`text-sm font-semibold ${
            game.status === 'final' && game.winningTeam === game.topTeam
              ? 'text-white'
              : game.status === 'final' && game.winningTeam && game.winningTeam !== game.topTeam
              ? 'text-gray-500'
              : 'text-gray-300'
          }`}>
            {game.topTeam || 'TBD'}
          </span>
          {game.topTeamScore != null && (
            <span className={`text-sm font-bold ${
              game.status === 'final' && game.winningTeam === game.topTeam ? 'text-white' : 'text-gray-400'
            }`}>
              {game.topTeamScore}
            </span>
          )}
        </div>

        {/* Bottom team */}
        <div className="flex items-center gap-2">
          {game.bottomTeamSeed && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-700/50 rounded px-1 py-0.5 min-w-[20px] text-center">
              {game.bottomTeamSeed}
            </span>
          )}
          <span className={`text-sm font-semibold ${
            game.status === 'final' && game.winningTeam === game.bottomTeam
              ? 'text-white'
              : game.status === 'final' && game.winningTeam && game.winningTeam !== game.bottomTeam
              ? 'text-gray-500'
              : 'text-gray-300'
          }`}>
            {game.bottomTeam || 'TBD'}
          </span>
          {game.bottomTeamScore != null && (
            <span className={`text-sm font-bold ${
              game.status === 'final' && game.winningTeam === game.bottomTeam ? 'text-white' : 'text-gray-400'
            }`}>
              {game.bottomTeamScore}
            </span>
          )}
        </div>

        {/* Scheduled date for upcoming games */}
        {game.status === 'upcoming' && game.scheduledDate && (
          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock size={10} />
            {formatScheduledDate(game.scheduledDate)}
          </div>
        )}

        {/* Region tag */}
        {game.region && (
          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
            {game.region}
          </span>
        )}
      </div>

      {/* Square winner info for final games */}
      {game.status === 'final' && game.squareWinner && (
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">
            ({game.winningDigit}, {game.losingDigit})
          </div>
          <div className="text-sm font-bold text-orange-400">{game.squareWinner}</div>
          <div className="text-xs font-bold text-green-400">+${game.payout}</div>
          {game.round === 2 && game.wrongWaySquareWinner && (
            <div className="text-xs text-gray-400 mt-0.5">
              Wrong way: <span className="text-orange-300">{game.wrongWaySquareWinner}</span> +${game.wrongWayPayout}
            </div>
          )}
        </div>
      )}

      {/* Live score detail */}
      {game.status === 'in_progress' && game.statusDetail && (
        <div className="text-right shrink-0">
          <span className="text-[10px] font-semibold text-red-400">{game.statusDetail}</span>
        </div>
      )}

      {/* Status badge */}
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[game.status]} ${
        game.status === 'in_progress' ? 'animate-pulse' : ''
      }`}>
        {game.status === 'in_progress' ? '● LIVE' : game.status.toUpperCase()}
      </span>

      {/* Admin edit button */}
      {isAdmin && (
        <button
          onClick={onStartEdit}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition"
        >
          <Edit3 size={14} />
        </button>
      )}
    </div>
  );
}
