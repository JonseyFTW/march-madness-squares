/**
 * Live ESPN API integration test
 *
 * Verifies that the ESPN scoreboard API returns valid data for NCAA men's
 * basketball. Tests both tournament-filtered and general scoreboard endpoints.
 *
 * Run with: npx vitest run src/utils/__tests__/espnApi.live.test.ts
 */
import { describe, it, expect } from 'vitest';
import { fetchTournamentScores } from '../espnApi';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball';

describe('ESPN API - Live Integration', () => {
  it('should connect to ESPN scoreboard API', async () => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?limit=5`);
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('leagues');
  });

  it('should return valid game structure from general scoreboard', async () => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?limit=5`);
    const data = await response.json();
    const events = data.events;

    // During the season there should be games
    if (events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('competitions');

      const comp = event.competitions[0];
      expect(comp.competitors).toHaveLength(2);

      for (const team of comp.competitors) {
        expect(team.team).toHaveProperty('displayName');
        expect(team.team).toHaveProperty('abbreviation');
        expect(team).toHaveProperty('score');
      }

      expect(comp.status.type).toHaveProperty('name');
      expect(['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_FINAL', 'STATUS_END_PERIOD']).toContain(
        comp.status.type.name
      );
    }
  });

  it('should fetch tournament games with groups=100 filter', async () => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?groups=100&limit=100`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(Array.isArray(data.events)).toBe(true);
    // Tournament may or may not have games depending on time of year
    console.log(`Tournament games found: ${data.events.length}`);
  });

  it('should fetch today\'s games using date filter', async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const response = await fetch(`${ESPN_BASE}/scoreboard?dates=${today}&limit=50`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    console.log(`Games for today (${today}): ${data.events.length}`);

    for (const event of data.events) {
      const comp = event.competitions[0];
      const t1 = comp.competitors[0].team.displayName;
      const t2 = comp.competitors[1].team.displayName;
      const s1 = comp.competitors[0].score;
      const s2 = comp.competitors[1].score;
      const status = comp.status.type.name;
      console.log(`  ${t2} ${s2} vs ${t1} ${s1} [${status}]`);
    }
  });

  it('should work through fetchTournamentScores() utility', async () => {
    const result = await fetchTournamentScores();
    expect(result).toHaveProperty('games');
    expect(Array.isArray(result.games)).toBe(true);
    expect(result.error).toBeUndefined();

    console.log(`fetchTournamentScores() returned ${result.games.length} games`);

    for (const game of result.games) {
      // Verify shape matches our expected interface
      expect(game).toHaveProperty('team1');
      expect(game).toHaveProperty('team2');
      expect(game).toHaveProperty('score1');
      expect(game).toHaveProperty('score2');
      expect(game).toHaveProperty('status');
      expect(game).toHaveProperty('espnId');
      expect(['upcoming', 'in_progress', 'final']).toContain(game.status);

      if (game.status === 'final') {
        expect(game.score1).toBeTypeOf('number');
        expect(game.score2).toBeTypeOf('number');
      }

      console.log(
        `  ${game.team1} ${game.score1 ?? '-'} vs ${game.team2} ${game.score2 ?? '-'} [${game.status}]`
      );
    }
  });

  it('should fetch historical tournament data with date param', async () => {
    // Use a known 2025 tournament date (First Four: March 18, 2025)
    const result = await fetchTournamentScores('20250320');
    expect(result.error).toBeUndefined();
    console.log(`Games for 2025-03-20: ${result.games.length}`);

    // There should be games on this date from the 2025 tournament
    if (result.games.length > 0) {
      expect(result.games[0].status).toBe('final');
      expect(result.games[0].score1).toBeTypeOf('number');
      expect(result.games[0].score2).toBeTypeOf('number');

      for (const game of result.games) {
        console.log(
          `  ${game.team1} ${game.score1} vs ${game.team2} ${game.score2} [${game.status}]`
        );
      }
    }
  });

  it('should handle in-progress game scores correctly', async () => {
    // Fetch today's general scoreboard (more likely to have live games)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const response = await fetch(`${ESPN_BASE}/scoreboard?dates=${today}&limit=50`);
    const data = await response.json();

    const inProgress = data.events.filter(
      (e: any) => e.competitions[0].status.type.name === 'STATUS_IN_PROGRESS' ||
                   e.competitions[0].status.type.name === 'STATUS_HALFTIME'
    );

    console.log(`In-progress games right now: ${inProgress.length}`);

    for (const event of inProgress) {
      const comp = event.competitions[0];
      const t1 = comp.competitors[0];
      const t2 = comp.competitors[1];
      const score1 = parseInt(t1.score);
      const score2 = parseInt(t2.score);

      // In-progress games should have numeric scores
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score2).toBeGreaterThanOrEqual(0);

      console.log(
        `  LIVE: ${t2.team.displayName} ${score2} vs ${t1.team.displayName} ${score1} [${comp.status.type.description}]`
      );
    }
  });

  it('should parse status types correctly for score tracking', async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const response = await fetch(`${ESPN_BASE}/scoreboard?dates=${today}&limit=50`);
    const data = await response.json();

    const statusCounts: Record<string, number> = {};
    for (const event of data.events) {
      const status = event.competitions[0].status.type.name;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    console.log('Status breakdown:', statusCounts);

    // Verify all statuses map to our expected types
    const validStatuses = ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_FINAL', 'STATUS_END_PERIOD', 'STATUS_POSTPONED', 'STATUS_CANCELED'];
    for (const status of Object.keys(statusCounts)) {
      expect(validStatuses).toContain(status);
    }
  });
});
