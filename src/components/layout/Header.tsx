import { Trophy, LayoutGrid, Gamepad2, Medal, Settings, BarChart3 } from 'lucide-react';

type Tab = 'dashboard' | 'board' | 'games' | 'leaderboard' | 'admin';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin: boolean;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
  { id: 'board', label: 'The Board', icon: <LayoutGrid size={18} /> },
  { id: 'games', label: 'Games', icon: <Gamepad2 size={18} /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Medal size={18} /> },
  { id: 'admin', label: 'Admin', icon: <Settings size={18} /> },
];

export default function Header({ activeTab, onTabChange, isAdmin }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-orange-500/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2 rounded-lg shadow-lg shadow-orange-500/20">
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                MARCH MADNESS
              </h1>
              <p className="text-[10px] font-bold tracking-[0.3em] text-orange-400 uppercase">
                Squares Pool 2026
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500/20 text-orange-400 shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'admin' && isAdmin && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
