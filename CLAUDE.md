# March Madness Squares Pool Tracker

## Project Overview
A React/TypeScript web app for tracking a March Madness squares pool. Deployed on Vercel. Uses ESPN's public API for live NCAA tournament game data.

## Tech Stack
- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel (auto-deploys from `main` branch)
- **Node**: v20.20.1 (via nvm at `/Users/chadjones/.nvm/versions/node/v20.20.1/bin`)

## Build Commands
```bash
npm run dev      # Start dev server
npm run build    # tsc -b && vite build
npm run lint     # ESLint
```

## Project Structure
```
src/
├── App.tsx                          # Main app with tab routing, ESPN sync, confetti
├── main.tsx                         # Entry point
├── types/index.ts                   # Game, AppState, Participant types
├── data/constants.ts                # Grid data, round configs, payouts
├── hooks/
│   ├── useAppState.ts               # Main state management (localStorage persistence)
│   └── useESPNSync.ts               # ESPN API polling hook
├── utils/
│   ├── espnApi.ts                   # ESPN API fetching + game merging
│   ├── gameUtils.ts                 # Score calculations, payout logic
│   └── participantUtils.ts          # Leaderboard calculations
└── components/
    ├── layout/Header.tsx
    ├── dashboard/Dashboard.tsx
    ├── board/SquareGrid.tsx          # 10x10 squares grid with heat map
    ├── games/GamesView.tsx           # Games list with live scores
    ├── leaderboard/Leaderboard.tsx
    └── admin/AdminPanel.tsx
```

## Key Architecture Decisions

### State Management
- All state stored in `localStorage` under key `march-madness-squares-2026`
- **Grid always loads from code** (`DEFAULT_GRID` in constants.ts), not from localStorage cache. This ensures grid updates in code are reflected for returning users.
- Games are synced from ESPN API and merged with local state

### ESPN API Integration
- **Base URL**: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard`
- **Group 100** = NCAA Tournament games only
- Fetches all tournament dates in parallel (First Four through Championship)
- Tournament dates for 2026 are hardcoded in `TOURNAMENT_DATES` array in espnApi.ts

### ESPN API Gotchas
- **Competitor ordering**: `competitors[0]` is home, `competitors[1]` is away. Do NOT use the `order` field — it's unreliable and caused a bug where the same team showed twice.
- **Seeds**: Found at `competitor.curatedRank.current`, NOT in a separate seed field
- **Round info**: Parsed from `competition.notes[0].headline` string (e.g., "NCAA Men's Basketball Championship - East Region - 1st Round")
- **Region info**: Also parsed from the headline string
- **Scores**: Come as strings that need `parseInt()`. Pre-game scores are "0" not null.
- **Status values**: `STATUS_FINAL`, `STATUS_IN_PROGRESS`, `STATUS_HALFTIME`, `STATUS_END_PERIOD`, `STATUS_SCHEDULED`

### ESPN Sync Hook (useESPNSync)
- Uses refs (`gamesRef`, `gridRef`, `onSyncRef`) to avoid infinite re-render loops. The sync callback must NOT depend on `games` in its dependency array since it updates games.
- Polls every **30 seconds** when live games detected, **5 minutes** when idle
- Syncs on mount automatically
- Available to all users (not admin-only)

## Pool Rules
- **Buy-in**: $20 per square (100 squares = $2,000 pot)
- **Payouts by round**:
  - Round of 64: $10/game (32 games = $320)
  - Round of 32: $30/game (16 games = $480)
  - Sweet 16: $50/game (8 games = $400)
  - Elite 8: $80/game (4 games = $320)
  - Final Four: $100/game (2 games = $200)
  - Championship: $280 right way + $80 wrong way
- Square winner determined by: row = loser's last digit, col = winner's last digit
- First Four (play-in) games have no payout (round 68)

## Admin
- **Password**: `madness2026` (stored in state, checked client-side)
- Admin can manually edit games, add/remove games, recalculate all results, reset games

## Database (Vercel Postgres)
- **Schema**: `db/schema.sql` — `boards` table (grid, digit order, settings) + `games` table (individual games as JSONB)
- **API Routes**: `/api/state.ts` (GET/POST board config), `/api/games.ts` (CRUD games), `/api/seed.ts` (initialize DB)
- **Setup**: Create a Vercel Postgres database, link it to the project, then call `POST /api/seed` once to initialize
- **Fallback**: If the database is unavailable, the app falls back to localStorage (footer shows "Local" vs "Synced")
- **Board ID**: Currently uses `'default'` — designed for future multi-board support

## Deployment Notes
- **No vitest** — removed test files that were breaking Vercel build. Don't add vitest without adding it to package.json dependencies.
- Vercel auto-deploys on push to `main`
- GitHub repo: `https://github.com/JonseyFTW/march-madness-squares`
- Git credentials use `gh auth` via Homebrew-installed GitHub CLI at `/usr/local/bin/gh`
- Old `/tmp/gh_install/...` path may appear in warnings but doesn't affect pushes

## Score Digit Order
The grid's row and column headers use randomized digit orders (not sequential 0-9). These are stored as `columnDigits` (winner) and `rowDigits` (loser) in `AppState` and `DEFAULT_COLUMN_DIGITS`/`DEFAULT_ROW_DIGITS` in constants.ts. The `calculateGameResult` function converts raw score digits to grid indices using these arrays.
