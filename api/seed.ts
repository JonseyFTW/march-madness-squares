import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// POST /api/seed — Initialize the database schema and seed the default board
// This is idempotent and safe to call multiple times.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY DEFAULT 'default',
        name TEXT NOT NULL DEFAULT 'March Madness 2026',
        grid JSONB NOT NULL,
        column_digits JSONB NOT NULL DEFAULT '[3,0,1,8,9,4,5,6,7,2]',
        row_digits JSONB NOT NULL DEFAULT '[7,5,3,4,0,6,9,2,1,8]',
        admin_password TEXT NOT NULL DEFAULT 'madness2026',
        tournament_year INTEGER NOT NULL DEFAULT 2026,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT NOT NULL,
        board_id TEXT NOT NULL DEFAULT 'default' REFERENCES boards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        PRIMARY KEY (id, board_id)
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_games_board_id ON games(board_id)
    `;

    // Seed default board if it doesn't exist
    const existing = await sql`SELECT id FROM boards WHERE id = 'default'`;

    if (existing.rows.length === 0) {
      const defaultGrid = [
        ['Eric Moore', 'Devin Pflueger', 'Chad Jones', 'Lance McIlvain', 'Chad Jones', 'Rene Anderson', 'Spenser Todd', 'Scott Askelson', 'Sarah McFarland', 'Shelby Moore'],
        ['Sarah McFarland', 'Camden Jackson', 'Devin Pflueger', 'Colton Moore', 'Chad Jones', 'Eric McFarland', 'Cole Jackson', 'Tuff Brady', 'Scott Askelson', 'Tommy Thacker'],
        ['Scott Askelson', 'Spenser Todd', 'Jackie Askelson', 'Devin Pflueger', 'Colton Moore', 'Ty McFarland', 'Rene Anderson', 'Chad Jones', 'Jaycek Jackson', 'Scott Askelson'],
        ['Karen McIlvain', 'Scott Askelson', 'Ryan Millett', 'Gunnar Gregory', 'Devin Pflueger', 'Colton Moore', 'Collin Strawn', 'Rene Anderson', 'Jason Simonton', 'Nikki Jackson'],
        ['Laura Brizell', 'Lance McIlvain', 'Scott Askelson', 'Ryan Millett', 'Kelly Nicholls', 'Devin Pflueger', 'Colton Moore', 'Nick Capouch', 'Steve Sanberg', 'Spenser Todd'],
        ['Morgan Carroll', 'Ty McFarland', 'Scott Brizell', 'Scott Askelson', 'Ryan Millett', 'Skyler Brady', 'Jason Simonton', 'Colton Moore', 'Stetson Christensen', 'Deklon Brady'],
        ['Rene Anderson', 'Morgan Carroll', 'Jason Simonton', 'Nick Capouch', 'Skyler Brady', 'Laura Brizell', 'Cole Jackson', 'Ryan Kearney', 'Chad Jones', 'Stetson Christensen'],
        ['Braylon Brady', 'Jason Simonton', 'Collin Strawn', 'Deklon Brady', 'Spenser Todd', 'Morgan Carroll', 'Camden Jackson', 'Gunnar Gregory', 'Tommy Thacker', 'Karen McIlvain'],
        ['Tommy Thacker', 'Jaycek Jackson', 'Skyler Brady', 'Ty McFarland', 'Nikki Jackson', 'Tommy Thacker', 'Morgan Carroll', 'Scott Brizell', 'Tuff Brady', 'Jeremy Dearborn'],
        ['Shelby Moore', 'Skyler Brady', 'Braylon Brady', 'Tommy Thacker', 'Rene Anderson', 'Stetson Christensen', 'Sarah McFarland', 'Stetson Christensen', 'Morgan Carroll', 'Eric Moore'],
      ];

      await sql`
        INSERT INTO boards (id, name, grid, column_digits, row_digits, admin_password, tournament_year)
        VALUES (
          'default',
          'March Madness 2026',
          ${JSON.stringify(defaultGrid)},
          '[3,0,1,8,9,4,5,6,7,2]',
          '[7,5,3,4,0,6,9,2,1,8]',
          'madness2026',
          2026
        )
      `;

      return res.status(200).json({ success: true, message: 'Database initialized and default board created.' });
    }

    return res.status(200).json({ success: true, message: 'Database tables verified. Default board already exists.' });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed database', details: String(error) });
  }
}
