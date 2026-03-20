import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// GET /api/games?boardId=default — load all games
// POST /api/games — bulk sync all games (replaces all games for the board)
// PUT /api/games — update a single game
// DELETE /api/games?boardId=default&gameId=xxx — delete a game
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const boardId = (req.query.boardId as string) || 'default';
      const result = await sql`
        SELECT data FROM games WHERE board_id = ${boardId}
      `;
      return res.status(200).json(result.rows.map(r => r.data));
    }

    if (req.method === 'POST') {
      // Bulk sync: upsert all games for this board
      const { boardId = 'default', games } = req.body;

      if (!Array.isArray(games)) {
        return res.status(400).json({ error: 'games must be an array' });
      }

      // Upsert each game to avoid duplicate key errors from concurrent requests
      const gameIds: string[] = [];
      for (const game of games) {
        gameIds.push(game.id);
        await sql`
          INSERT INTO games (id, board_id, data)
          VALUES (${game.id}, ${boardId}, ${JSON.stringify(game)})
          ON CONFLICT (id, board_id) DO UPDATE SET data = ${JSON.stringify(game)}
        `;
      }

      // Remove games that are no longer in the synced set
      if (gameIds.length > 0) {
        await sql`
          DELETE FROM games
          WHERE board_id = ${boardId}
          AND id != ALL(${gameIds}::text[])
        `;
      }

      // Update the board's updated_at timestamp
      await sql`UPDATE boards SET updated_at = NOW() WHERE id = ${boardId}`;

      return res.status(200).json({ success: true, count: games.length });
    }

    if (req.method === 'PUT') {
      // Update a single game
      const { boardId = 'default', game } = req.body;

      if (!game || !game.id) {
        return res.status(400).json({ error: 'game with id is required' });
      }

      await sql`
        INSERT INTO games (id, board_id, data)
        VALUES (${game.id}, ${boardId}, ${JSON.stringify(game)})
        ON CONFLICT (id, board_id) DO UPDATE SET data = ${JSON.stringify(game)}
      `;

      await sql`UPDATE boards SET updated_at = NOW() WHERE id = ${boardId}`;

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const boardId = (req.query.boardId as string) || 'default';
      const gameId = req.query.gameId as string;

      if (!gameId) {
        return res.status(400).json({ error: 'gameId is required' });
      }

      await sql`DELETE FROM games WHERE id = ${gameId} AND board_id = ${boardId}`;
      await sql`UPDATE boards SET updated_at = NOW() WHERE id = ${boardId}`;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Games API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
