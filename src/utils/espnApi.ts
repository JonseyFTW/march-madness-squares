import { Game, GameStatus, RoundNumber } from '../types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball';

// Tournament dates for 2026 NCAA March Madness
const TOURNAMENT_DATES = [
  // First Four
  '20260317', '20260318',
  // Round of 64
  '20260319', '20260320',
  // Round of 32
  '20260321', '20260322',
  // Sweet 16
  '20260326', '20260327',
  // Elite 8
  '20260328', '20260329',
  // Final Four
  '20260404',
  // Championship
  '20260406',
];

interface ESPNCompetitor {
  team: { displayName: string; abbreviation: string; shortDisplayName?: string; location?: string };
  score: string;
  curatedRank?: { current: number };
  order: number;
  winner?: boolean;
}

interface ESPNNote {
  type: string;
  headline: string;
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: {
    type: { name: string; completed: boolean; description: string };
    displayClock?: string;
    period?: number;
  };
  notes?: ESPNNote[];
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  competitions: ESPNCompetition[];
  status: {
    type: { name: string; completed: boolean; description: string };
    displayClock?: string;
    period?: number;
  };
}

interface ESPNScoreboard {
  events: ESPNEvent[];
}

export interface ESPNGame {
  espnId: string;
  topTeam: string;
  bottomTeam: string;
  topTeamShort?: string;
  bottomTeamShort?: string;
  topTeamSeed?: number;
  bottomTeamSeed?: number;
  topTeamScore: number | null;
  bottomTeamScore: number | null;
  status: GameStatus;
  statusDetail: string;
  region?: string;
  roundName?: string;
  round: RoundNumber;
  scheduledDate: string;
  displayClock?: string;
  period?: number;
  topTeamIsHome?: boolean;
}

function parseRoundFromHeadline(headline: string): RoundNumber {
  const lower = headline.toLowerCase();
  if (lower.includes('first four')) return 68;
  if (lower.includes('1st round')) return 64;
  if (lower.includes('2nd round')) return 32;
  if (lower.includes('sweet 16') || lower.includes('regional semifinal')) return 16;
  if (lower.includes('elite 8') || lower.includes('elite eight') || lower.includes('regional final')) return 8;
  if (lower.includes('final four') || lower.includes('national semifinal')) return 4;
  if (lower.includes('championship') || lower.includes('national championship')) return 2;
  // Fallback based on keywords
  if (lower.includes('3rd round')) return 16;
  if (lower.includes('4th round')) return 8;
  return 64;
}

function parseRegionFromHeadline(headline: string): string | undefined {
  const match = headline.match(/(East|West|South|Midwest)\s+Region/i);
  return match ? match[1] : undefined;
}

function parseStatus(statusName: string): GameStatus {
  if (statusName === 'STATUS_FINAL') return 'final';
  if (
    statusName === 'STATUS_IN_PROGRESS' ||
    statusName === 'STATUS_HALFTIME' ||
    statusName === 'STATUS_END_PERIOD'
  )
    return 'in_progress';
  return 'upcoming';
}

function parseESPNEvent(event: ESPNEvent): ESPNGame {
  const comp = event.competitions[0];
  const competitors = comp.competitors;

  // ESPN: competitors[0] is home, competitors[1] is away
  const home = competitors[0];
  const away = competitors[1];

  const homeSeed = home?.curatedRank?.current;
  const awaySeed = away?.curatedRank?.current;

  // Put higher-seeded team (lower number) on top
  let topTeam = home;
  let bottomTeam = away;
  let topTeamIsHome = true;
  if (homeSeed && awaySeed && awaySeed < homeSeed) {
    topTeam = away;
    bottomTeam = home;
    topTeamIsHome = false;
  }

  const statusName = comp.status?.type?.name || event.status?.type?.name || '';
  const statusDetail = comp.status?.type?.description || event.status?.type?.description || '';
  const status = parseStatus(statusName);

  const headline = comp.notes?.[0]?.headline || '';
  const round = parseRoundFromHeadline(headline);
  const region = parseRegionFromHeadline(headline);

  const topScore = topTeam?.score ? parseInt(topTeam.score) : null;
  const bottomScore = bottomTeam?.score ? parseInt(bottomTeam.score) : null;

  const displayClock = comp.status?.displayClock || event.status?.displayClock;
  const period = comp.status?.period || event.status?.period;

  return {
    espnId: event.id,
    topTeam: topTeam?.team?.displayName || 'TBD',
    bottomTeam: bottomTeam?.team?.displayName || 'TBD',
    topTeamShort: topTeam?.team?.shortDisplayName || topTeam?.team?.location || undefined,
    bottomTeamShort: bottomTeam?.team?.shortDisplayName || bottomTeam?.team?.location || undefined,
    topTeamSeed: topTeam?.curatedRank?.current,
    bottomTeamSeed: bottomTeam?.curatedRank?.current,
    topTeamScore: status === 'upcoming' ? null : (isNaN(topScore!) ? null : topScore),
    bottomTeamScore: status === 'upcoming' ? null : (isNaN(bottomScore!) ? null : bottomScore),
    status,
    statusDetail,
    region,
    roundName: headline,
    round,
    scheduledDate: event.date,
    displayClock,
    period,
    topTeamIsHome,
  };
}

export async function fetchAllTournamentGames(): Promise<{
  games: ESPNGame[];
  error?: string;
}> {
  try {
    // Fetch all tournament dates in parallel
    const fetches = TOURNAMENT_DATES.map(async (date) => {
      const url = `${ESPN_BASE}/scoreboard?groups=100&limit=100&dates=${date}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data: ESPNScoreboard = await response.json();
      return data.events.map(parseESPNEvent);
    });

    const results = await Promise.all(fetches);
    const allGames = results.flat();

    // Deduplicate by espnId (same game might appear on multiple date queries)
    const seen = new Set<string>();
    const unique = allGames.filter(g => {
      if (seen.has(g.espnId)) return false;
      seen.add(g.espnId);
      return true;
    });

    // Sort by scheduled date
    unique.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return { games: unique };
  } catch (error) {
    return {
      games: [],
      error: error instanceof Error ? error.message : 'Failed to fetch tournament games',
    };
  }
}

/**
 * Merge ESPN games into our app's game state.
 * Maps ESPN data onto existing game slots by round, or creates new ones.
 */
export function mergeESPNGames(espnGames: ESPNGame[], existingGames: Game[]): Game[] {
  // Group ESPN games by round
  const espnByRound = new Map<RoundNumber, ESPNGame[]>();
  for (const g of espnGames) {
    const list = espnByRound.get(g.round) || [];
    list.push(g);
    espnByRound.set(g.round, list);
  }

  // Build the merged game list
  const merged: Game[] = [];
  const usedEspnIds = new Set<string>();

  // First, try to match existing games by espnId
  for (const existing of existingGames) {
    const espnMatch = espnGames.find(e => e.espnId === (existing as any).espnId);
    if (espnMatch) {
      usedEspnIds.add(espnMatch.espnId);
      merged.push(updateGameFromESPN(existing, espnMatch));
    } else {
      merged.push(existing);
    }
  }

  // Now, for each round, find ESPN games that weren't matched and assign them to
  // empty slots or create new ones
  for (const [round, espnRoundGames] of espnByRound.entries()) {
    const unmatched = espnRoundGames.filter(e => !usedEspnIds.has(e.espnId));

    for (const espnGame of unmatched) {
      // Find an empty slot in this round
      const emptySlot = merged.find(
        g => g.round === round && !g.topTeam && !(g as any).espnId
      );

      if (emptySlot) {
        usedEspnIds.add(espnGame.espnId);
        Object.assign(emptySlot, updateGameFromESPN(emptySlot, espnGame));
      } else {
        // Try matching by team name
        const nameMatch = merged.find(g => {
          if (g.round !== round || (g as any).espnId) return false;
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
          const top = normalize(g.topTeam);
          const bottom = normalize(g.bottomTeam);
          const e1 = normalize(espnGame.topTeam);
          const e2 = normalize(espnGame.bottomTeam);
          return (
            (top && (top.includes(e1) || e1.includes(top))) ||
            (bottom && (bottom.includes(e2) || e2.includes(bottom)))
          );
        });

        if (nameMatch) {
          usedEspnIds.add(espnGame.espnId);
          Object.assign(nameMatch, updateGameFromESPN(nameMatch, espnGame));
        } else {
          // Create a new game entry
          usedEspnIds.add(espnGame.espnId);
          merged.push({
            id: `espn-${espnGame.espnId}`,
            round: espnGame.round,
            gameNumber: merged.filter(g => g.round === round).length + 1,
            topTeam: espnGame.topTeam,
            bottomTeam: espnGame.bottomTeam,
            topTeamSeed: espnGame.topTeamSeed,
            bottomTeamSeed: espnGame.bottomTeamSeed,
            topTeamScore: espnGame.topTeamScore ?? undefined,
            bottomTeamScore: espnGame.bottomTeamScore ?? undefined,
            status: espnGame.status,
            region: espnGame.region,
            scheduledDate: espnGame.scheduledDate,
            espnId: espnGame.espnId,
            statusDetail: espnGame.statusDetail,
          } as Game);
        }
      }
    }
  }

  // Re-number games within each round
  const roundOrder: RoundNumber[] = [68, 64, 32, 16, 8, 4, 2];
  for (const round of roundOrder) {
    const roundGames = merged
      .filter(g => g.round === round)
      .sort((a, b) => {
        const dateA = (a as any).scheduledDate ? new Date((a as any).scheduledDate).getTime() : 0;
        const dateB = (b as any).scheduledDate ? new Date((b as any).scheduledDate).getTime() : 0;
        return dateA - dateB || a.gameNumber - b.gameNumber;
      });
    roundGames.forEach((g, i) => {
      g.gameNumber = i + 1;
    });
  }

  return merged;
}

const ESPN_CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball';

interface ESPNPlay {
  homeScore: number;
  awayScore: number;
  scoringPlay: boolean;
  scoreValue: number;
}

/**
 * Fetch the score before the last basket from ESPN's core play-by-play API.
 * Returns { previousHomeScore, previousAwayScore } or null if unavailable.
 */
export async function fetchPreviousScore(espnId: string): Promise<{ previousHomeScore: number; previousAwayScore: number } | null> {
  try {
    // First, get the total play count
    const countUrl = `${ESPN_CORE_BASE}/events/${espnId}/competitions/${espnId}/plays?limit=1`;
    const countRes = await fetch(countUrl);
    if (!countRes.ok) return null;
    const countData = await countRes.json();
    const totalPlays = countData.count;
    if (!totalPlays || totalPlays < 2) return null;

    // Fetch the last ~20 plays to find the last two scoring plays
    const lastPageSize = 20;
    const page = Math.max(1, Math.ceil(totalPlays / lastPageSize));
    const playsUrl = `${ESPN_CORE_BASE}/events/${espnId}/competitions/${espnId}/plays?limit=${lastPageSize}&page=${page}`;
    const playsRes = await fetch(playsUrl);
    if (!playsRes.ok) return null;
    const playsData = await playsRes.json();
    const plays: ESPNPlay[] = playsData.items || [];

    // Find scoring plays from the end
    const scoringPlays = plays.filter((p: ESPNPlay) => p.scoringPlay);
    if (scoringPlays.length < 2) {
      // Need more data — try previous page too
      if (page > 1) {
        const prevUrl = `${ESPN_CORE_BASE}/events/${espnId}/competitions/${espnId}/plays?limit=${lastPageSize}&page=${page - 1}`;
        const prevRes = await fetch(prevUrl);
        if (prevRes.ok) {
          const prevData = await prevRes.json();
          const prevPlays: ESPNPlay[] = prevData.items || [];
          const prevScoring = prevPlays.filter((p: ESPNPlay) => p.scoringPlay);
          scoringPlays.unshift(...prevScoring);
        }
      }
    }

    if (scoringPlays.length < 2) return null;

    // The second-to-last scoring play has the score before the final basket
    const previousPlay = scoringPlays[scoringPlays.length - 2];
    return {
      previousHomeScore: previousPlay.homeScore,
      previousAwayScore: previousPlay.awayScore,
    };
  } catch {
    return null;
  }
}

function updateGameFromESPN(existing: Game, espn: ESPNGame): Game {
  return {
    ...existing,
    topTeam: espn.topTeam,
    bottomTeam: espn.bottomTeam,
    topTeamShort: espn.topTeamShort,
    bottomTeamShort: espn.bottomTeamShort,
    topTeamSeed: espn.topTeamSeed,
    bottomTeamSeed: espn.bottomTeamSeed,
    topTeamScore: espn.topTeamScore ?? existing.topTeamScore,
    bottomTeamScore: espn.bottomTeamScore ?? existing.bottomTeamScore,
    status: espn.status,
    region: espn.region,
    scheduledDate: espn.scheduledDate,
    espnId: espn.espnId,
    statusDetail: espn.statusDetail,
    displayClock: espn.displayClock,
    period: espn.period,
    topTeamIsHome: espn.topTeamIsHome,
  } as Game;
}
