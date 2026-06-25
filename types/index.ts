// ============================================================
// FootballScout AI — TypeScript Types
// ============================================================

// ---------- Enums / Literal Unions ----------

/** Позиция игрока на поле */
export type PlayerPosition =
  | 'GK'   // Вратарь
  | 'CB'   // Центральный защитник
  | 'LB'   // Левый защитник
  | 'RB'   // Правый защитник
  | 'CDM'  // Опорный полузащитник
  | 'CM'   // Центральный полузащитник
  | 'CAM'  // Атакующий полузащитник
  | 'LM'   // Левый полузащитник
  | 'RM'   // Правый полузащитник
  | 'LW'   // Левый вингер
  | 'RW'   // Правый вингер
  | 'CF'   // Центральный нападающий
  | 'ST';  // Страйкер

/** Тип матча */
export type MatchType = 'тренировка' | 'официальный' | 'товарищеский';

/** Тип медиафайла */
export type MediaFileType = 'image' | 'video';

/** Ключ метрики */
export type MetricKey = 'technique' | 'tactics' | 'physical' | 'mentality' | 'decision';

/** Тренерская методика */
export type CoachingMethod =
  | 'Система Гвардиолы'
  | 'Прессинг Клоппа'
  | 'Тактика Анчелотти'
  | 'Оборона Моуриньо'
  | 'Интенсивность Бьелсы'
  | 'Модерн Нагельсмана';

// ---------- Database Row Types ----------

/** Игрок */
export interface Player {
  id: string;
  name: string;
  age: number | null;
  position: PlayerPosition | null;
  club: string | null;
  weight: number | null;
  height: number | null;
  created_at: string;
}

/** Матч */
export interface Match {
  id: string;
  player_id: string;
  match_date: string;        // ISO date string (YYYY-MM-DD)
  opponent: string | null;
  match_type: MatchType | null;
  notes: string | null;
  created_at: string;
}

/** Матч с вложенными связями (для детальных страниц) */
export interface MatchWithRelations extends Match {
  player?: Player;
  media?: Media[];
  analyses?: Analysis[];
}

/** Медиафайл */
export interface Media {
  id: string;
  match_id: string;
  file_url: string;
  file_type: MediaFileType;
  file_name: string | null;
  created_at: string;
}

/** Упражнение в плане тренировок */
export interface WorkoutExercise {
  time: string;           // "09:00"
  exercise: string;       // "Рондо 4v2 с позиционными ротациями"
  duration_min: number;   // 20
  method: CoachingMethod; // "Система Гвардиолы"
  focus: MetricKey;       // "technique"
}

/** Результат AI-анализа */
export interface Analysis {
  id: string;
  match_id: string;
  raw_response: string | null;
  technique_score: number;   // 1-10
  tactics_score: number;     // 1-10
  physical_score: number;    // 1-10
  mentality_score: number;   // 1-10
  decision_score: number;    // 1-10
  overall_score: number;     // 1-10
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  position_recommendation: string | null;
  workout_plan: WorkoutExercise[];
  created_at: string;
}

// ---------- AI / Gemini Vision API ----------

/** Ответ Gemini Vision API (парсится из JSON) */
export interface GeminiAnalysisResponse {
  technique_score: number;
  tactics_score: number;
  physical_score: number;
  mentality_score: number;
  decision_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  position_recommendation: string;
  summary: string;
  workout_plan: WorkoutExercise[];
}

/** Payload для POST /api/analyze (FormData — video) */
export interface AnalyzeRequestPayload {
  match_id: string;
  player_name: string;
  player_age: number | null;
  player_position: string | null;
  opponent: string | null;
  match_type: string | null;
}

/** Ответ POST /api/analyze */
export interface AnalyzeResponsePayload {
  success: boolean;
  analysis?: Analysis;
  error?: string;
}

// ---------- Upload API ----------

/** Payload для POST /api/upload */
export interface UploadRequestPayload {
  match_id: string;
  file_name: string;
  file_type: MediaFileType;
  file_base64: string;        // base64-encoded file
}

/** Ответ POST /api/upload */
export interface UploadResponsePayload {
  success: boolean;
  media?: Media;
  error?: string;
}

// ---------- Form / UI Types ----------

/** Форма создания игрока */
export interface PlayerFormData {
  name: string;
  age: number | null;
  position: PlayerPosition | null;
  club: string | null;
  weight: number | null;
  height: number | null;
}

/** Форма создания матча */
export interface MatchFormData {
  player_id: string;
  match_date: string;
  opponent: string;
  match_type: MatchType;
  notes: string;
}

/** Видео-файл подготовленный к загрузке */
export interface VideoFile {
  file: File;
  name: string;
  size: number;
  progress: number;         // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
}

// ---------- Score Color Helpers ----------

/** Цвет оценки по баллу (8-10 зелёный, 5-7 жёлтый, 1-4 красный) */
export type ScoreColor = 'green' | 'yellow' | 'red';

export function getScoreColor(score: number): ScoreColor {
  if (score >= 8) return 'green';
  if (score >= 5) return 'yellow';
  return 'red';
}

/** Hex-код цвета по баллу */
export function getScoreHex(score: number): string {
  if (score >= 8) return '#00FF87';
  if (score >= 5) return '#FFD600';
  return '#FF4444';
}

// ---------- Coaching Method Colors ----------

/** Цвет бейджа для тренерской методики */
export function getMethodBadgeClass(method: CoachingMethod): string {
  const map: Record<CoachingMethod, string> = {
    'Система Гвардиолы': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Прессинг Клоппа': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Тактика Анчелотти': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Оборона Моуриньо': 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    'Интенсивность Бьелсы': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Модерн Нагельсмана': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return map[method] || 'bg-white/10 text-white/60 border-white/20';
}

/** Русская метка для ключа метрики */
export function getMetricLabel(key: MetricKey): string {
  const map: Record<MetricKey, string> = {
    technique: 'Техника',
    tactics: 'Тактика',
    physical: 'Физика',
    mentality: 'Ментальность',
    decision: 'Решения',
  };
  return map[key];
}

// ---------- Radar Chart Data ----------

/** Данные для радарной диаграммы */
export interface RadarDataPoint {
  metric: string;
  value: number;
  fullMark: number;
}

/** Преобразование анализа в массив для радарной диаграммы */
export function analysisToRadarData(analysis: Analysis): RadarDataPoint[] {
  return [
    { metric: 'Техника', value: analysis.technique_score, fullMark: 10 },
    { metric: 'Тактика', value: analysis.tactics_score, fullMark: 10 },
    { metric: 'Физика', value: analysis.physical_score, fullMark: 10 },
    { metric: 'Ментальность', value: analysis.mentality_score, fullMark: 10 },
    { metric: 'Решения', value: analysis.decision_score, fullMark: 10 },
  ];
}

// ---------- Progress Chart ----------

/** Точка данных для графика прогресса */
export interface ProgressDataPoint {
  date: string;               // дата матча
  opponent: string | null;
  technique: number;
  tactics: number;
  physical: number;
  mentality: number;
  decision: number;
  overall: number;
}
