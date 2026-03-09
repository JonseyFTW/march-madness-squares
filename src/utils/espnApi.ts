import { Game } from '../types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball';

interface ESPNCompetitor {
  team: { displayName: string; abbreviation: string };
  score: string;
  winner?: boolean;
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: {
    type: { name: string; completed: boolean };
  };
}

interface ESPNEvent {
  id: string;
  name: string;
  competitions: ESPNCompetition[];
  status: {
    type: { name: string; completed: boolean };
  };
  season: { year: number; type: number };
}

interface ESPNScoreboard {
  events: ESPNEvent[];
}

export async function fetchTournamentScores(dates?: string): Promise<{
  games: Array<{
    team1: string;
    team2: string;
    score1: number | null;
    score2: number | null;
    status: 'upcoming' | 'in_progress' | 'final';
    espnId: string;
  }>;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      groups: '100', // NCAA Tournament group
      limit: '100',
    });
    if (dates) params.set('dates', dates);

    const url = `${ESPN_BASE}/scoreboard?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status}`);
    }

    const data: ESPNScoreboard = await response.json();
    const games = data.events.map(event => {
      const comp = event.competitions[0];
      const competitors = comp.competitors;
      const team1 = competitors[0]?.team?.displayName || 'TBD';
      const team2 = competitors[1]?.team?.displayName || 'TBD';
      const score1 = competitors[0]?.score ? parseInt(competitors[0].score) : null;
      const score2 = competitors[1]?.score ? parseInt(competitors[1].score) : null;

      let status: 'upcoming' | 'in_progress' | 'final' = 'upcoming';
      const statusName = comp.status?.type?.name || event.status?.type?.name;
      if (statusName === 'STATUS_FINAL') status = 'final';
      else if (statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME')
        status = 'in_progress';

      return { team1, team2, score1, score2, status, espnId: event.id };
    });

    return { games };
  } catch (error) {
    return {
      games: [],
      error: error instanceof Error ? error.message : 'Failed to fetch scores',
    };
  }
}

export function matchESPNToGame(
  espnTeam1: string,
  espnTeam2: string,
  existingGames: Game[]
): Game | undefined {
  // Try to match by team names (fuzzy)
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

  return existingGames.find(g => {
    const top = normalize(g.topTeam);
    const bottom = normalize(g.bottomTeam);
    const e1 = normalize(espnTeam1);
    const e2 = normalize(espnTeam2);

    return (
      (top.includes(e1) || e1.includes(top) || top.includes(e2) || e2.includes(top)) &&
      (bottom.includes(e1) || e1.includes(bottom) || bottom.includes(e2) || e2.includes(bottom))
    );
  });
}
