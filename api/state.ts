import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// GET /api/state?boardId=default — load full board state
// POST /api/state — save board config (grid, digits, etc.)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const boardId = (req.query.boardId as string) || 'default';

      // Load board config
      const boardResult = await sql`
        SELECT id, name, grid, column_digits, row_digits, admin_password, tournament_year, updated_at
        FROM boards WHERE id = ${boardId}
      `;

      if (boardResult.rows.length === 0) {
        return res.status(404).json({ error: 'Board not found' });
      }

      const board = boardResult.rows[0];

      // Load games for this board
      const gamesResult = await sql`
        SELECT data FROM games WHERE board_id = ${boardId}
      `;

      const games = gamesResult.rows.map(r => r.data);

      return res.status(200).json({
        grid: board.grid,
        columnDigits: board.column_digits,
        rowDigits: board.row_digits,
        games,
        adminPassword: board.admin_password,
        tournamentYear: board.tournament_year,
        lastUpdated: board.updated_at,
      });
    }

    if (req.method === 'POST') {
      const { boardId = 'default', grid, columnDigits, rowDigits, adminPassword, tournamentYear } = req.body;

      await sql`
        INSERT INTO boards (id, grid, column_digits, row_digits, admin_password, tournament_year, updated_at)
        VALUES (${boardId}, ${JSON.stringify(grid)}, ${JSON.stringify(columnDigits)}, ${JSON.stringify(rowDigits)}, ${adminPassword || 'madness2026'}, ${tournamentYear || 2026}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          grid = ${JSON.stringify(grid)},
          column_digits = ${JSON.stringify(columnDigits)},
          row_digits = ${JSON.stringify(rowDigits)},
          admin_password = COALESCE(${adminPassword}, boards.admin_password),
          tournament_year = COALESCE(${tournamentYear}, boards.tournament_year),
          updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('State API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
