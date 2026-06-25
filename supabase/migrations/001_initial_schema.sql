-- ============================================================
-- FootballScout AI — Database Schema (Supabase / PostgreSQL)
-- Запустите этот SQL в Supabase SQL Editor
-- ============================================================

-- 1. Таблица игроков
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  position TEXT,
  club TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Таблица матчей
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  opponent TEXT,
  match_type TEXT CHECK (match_type IN ('тренировка', 'официальный', 'товарищеский')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Таблица медиафайлов
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Таблица анализов (AI)
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  raw_response TEXT,
  technique_score INTEGER CHECK (technique_score BETWEEN 1 AND 10),
  tactics_score INTEGER CHECK (tactics_score BETWEEN 1 AND 10),
  physical_score INTEGER CHECK (physical_score BETWEEN 1 AND 10),
  mentality_score INTEGER CHECK (mentality_score BETWEEN 1 AND 10),
  decision_score INTEGER CHECK (decision_score BETWEEN 1 AND 10),
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  position_recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_matches_player_id ON matches(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_media_match_id ON media(match_id);
CREATE INDEX IF NOT EXISTS idx_analyses_match_id ON analyses(match_id);

-- ============================================================
-- Row Level Security (RLS)
-- Для личного использования — разрешаем все операции
-- авторизованным пользователям
-- ============================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policies: разрешаем всё авторизованным + service_role
CREATE POLICY "Allow all for authenticated users" ON players
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON matches
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON media
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON analyses
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Storage Bucket
-- Создайте bucket 'match-media' в Supabase Dashboard → Storage
-- или используйте SQL ниже:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('match-media', 'match-media', true)
-- ON CONFLICT (id) DO NOTHING;
