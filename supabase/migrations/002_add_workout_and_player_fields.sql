-- ============================================================
-- FootballScout AI — Migration 002
-- Добавление полей weight/height в players,
-- workout_plan в analyses
-- ============================================================

-- Рост и вес игрока
ALTER TABLE players ADD COLUMN IF NOT EXISTS weight INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS height INTEGER;

-- План тренировок (JSONB массив упражнений)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS workout_plan JSONB DEFAULT '[]'::jsonb;
