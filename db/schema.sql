-- March Madness Squares Pool - Database Schema
-- Run this in your Vercel Postgres console to initialize the database.

-- Boards table: each board represents one pool
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'March Madness 2026',
  grid JSONB NOT NULL,
  column_digits JSONB NOT NULL DEFAULT '[3,0,1,8,9,4,5,6,7,2]',
  row_digits JSONB NOT NULL DEFAULT '[7,5,3,4,0,6,9,2,1,8]',
  admin_password TEXT NOT NULL DEFAULT 'madness2026',
  tournament_year INTEGER NOT NULL DEFAULT 2026,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Games table: individual games linked to a board
CREATE TABLE IF NOT EXISTS games (
  id TEXT NOT NULL,
  board_id TEXT NOT NULL DEFAULT 'default' REFERENCES boards(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  PRIMARY KEY (id, board_id)
);

-- Index for fast game lookups by board
CREATE INDEX IF NOT EXISTS idx_games_board_id ON games(board_id);
