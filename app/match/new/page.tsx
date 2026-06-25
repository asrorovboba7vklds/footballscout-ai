'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  Save,
  User,
  Loader2,
  CheckCircle2,
  Upload,
  Brain,
  Database,
  Pencil,
  X,
  Ruler,
  Weight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MediaUploader from '@/components/MediaUploader';
import { supabase } from '@/lib/supabase';
import type { Player, MatchType, PlayerPosition } from '@/types';

type AnalyzeStep = 'idle' | 'saving_match' | 'uploading' | 'analyzing' | 'saving_result' | 'done' | 'error';

const STEP_LABELS: Record<AnalyzeStep, string> = {
  idle: '',
  saving_match: 'Создание записи матча...',
  uploading: 'Загрузка видео в облако...',
  analyzing: 'Gemini анализирует видео...',
  saving_result: 'Сохранение результатов...',
  done: 'Готово! Перенаправление...',
  error: 'Ошибка',
};

const POSITIONS: PlayerPosition[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST',
];

export default function NewMatchPage() {
  const router = useRouter();

  // ── Player state ──
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [showPlayerForm, setShowPlayerForm] = useState(false);   // create-new form
  const [showEditModal, setShowEditModal] = useState(false);      // edit-existing modal
  const [playerForm, setPlayerForm] = useState({
    name: '',
    age: '',
    position: '' as string,
    club: '',
    weight: '',
    height: '',
  });

  // ── Match state ──
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('тренировка');
  const [notes, setNotes] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // ── Flow state ──
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>('idle');
  const [error, setError] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // ── Fetch player on mount ──
  useEffect(() => {
    async function fetchPlayer() {
      setPlayerLoading(true);
      const { data } = await supabase
        .from('players')
        .select('*')
        .limit(1)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setPlayer(data[0]);
      } else {
        setShowPlayerForm(true);
      }
      setPlayerLoading(false);
    }
    fetchPlayer();
  }, []);

  // ── Populate edit form when opening the modal ──
  const openEditModal = () => {
    if (!player) return;
    setPlayerForm({
      name: player.name || '',
      age: player.age != null ? String(player.age) : '',
      position: player.position || '',
      club: player.club || '',
      weight: player.weight != null ? String(player.weight) : '',
      height: player.height != null ? String(player.height) : '',
    });
    setShowEditModal(true);
    setError('');
    setProfileSaveSuccess(false);
  };

  // ── Create player (first time) ──
  const handleCreatePlayer = async () => {
    if (!playerForm.name.trim()) {
      setError('Введите имя игрока');
      return;
    }
    setSaving(true);
    setError('');

    const { data, error: err } = await supabase
      .from('players')
      .insert({
        name: playerForm.name.trim(),
        age: playerForm.age ? parseInt(playerForm.age) : null,
        position: playerForm.position || null,
        club: playerForm.club.trim() || null,
        weight: playerForm.weight ? parseInt(playerForm.weight) : null,
        height: playerForm.height ? parseInt(playerForm.height) : null,
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setPlayer(data);
    setShowPlayerForm(false);
    setSaving(false);
  };

  // ── Update existing player profile ──
  const handleUpdatePlayer = async () => {
    if (!player) return;
    if (!playerForm.name.trim()) {
      setError('Имя игрока не может быть пустым');
      return;
    }
    setSaving(true);
    setError('');
    setProfileSaveSuccess(false);

    const payload = {
      name: playerForm.name.trim(),
      age: playerForm.age ? parseInt(playerForm.age) : null,
      position: playerForm.position || null,
      club: playerForm.club.trim() || null,
      weight: playerForm.weight ? parseInt(playerForm.weight) : null,
      height: playerForm.height ? parseInt(playerForm.height) : null,
    };

    const { data, error: err } = await supabase
      .from('players')
      .update(payload)
      .eq('id', player.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setPlayer(data);
    setProfileSaveSuccess(true);
    setSaving(false);

    // Auto-close after brief success feedback
    setTimeout(() => {
      setShowEditModal(false);
      setProfileSaveSuccess(false);
    }, 900);
  };

  const handleVideoReady = useCallback((file: File | null) => {
    setVideoFile(file);
  }, []);

  /**
   * Normalise any date-like value into ISO YYYY-MM-DD.
   * Handles: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY,
   * Russian locale strings like "25 июня 2026 г.", and
   * native Date.toLocaleDateString output.
   */
  const normaliseDateToISO = (raw: string): string => {
    if (!raw || !raw.trim()) return new Date().toISOString().split('T')[0];
    const s = raw.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dotMatch = s.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
    if (dotMatch) {
      const [, dd, mm, yyyy] = dotMatch;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    // Russian locale: "25 июня 2026 г." / "25 июн. 2026" etc.
    const ruMonths: Record<string, string> = {
      'янв': '01', 'фев': '02', 'мар': '03', 'апр': '04',
      'мая': '05', 'май': '05', 'июн': '06', 'июл': '07',
      'авг': '08', 'сен': '09', 'окт': '10', 'ноя': '11', 'дек': '12',
      'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
      'июня': '06', 'июля': '07', 'августа': '08', 'сентября': '09',
      'октября': '10', 'ноября': '11', 'декабря': '12',
    };
    const ruMatch = s.match(/(\d{1,2})\s+([а-яё]+)\.?\s+(\d{4})/);
    if (ruMatch) {
      const [, dd, monthStr, yyyy] = ruMatch;
      const monthKey = monthStr.toLowerCase().replace(/\.$/, '');
      const mm = ruMonths[monthKey];
      if (mm) return `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
    }

    // Fallback: try native Date parsing
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    // Last resort: today
    return new Date().toISOString().split('T')[0];
  };

  /** Handle date input change — normalise immediately if needed */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // For proper date inputs, value is always YYYY-MM-DD
    // For fallback text inputs, normalise immediately
    if (/^\d{4}-\d{2}-\d{2}$/.test(val) || val === '') {
      setMatchDate(val);
    } else {
      setMatchDate(normaliseDateToISO(val));
    }
  };

  const handleSaveMatch = async (withAnalysis: boolean) => {
    if (!player) {
      setError('Сначала создайте профиль игрока');
      return;
    }
    if (!matchDate) {
      setError('Укажите дату матча');
      return;
    }

    setSaving(true);
    setError('');
    setAnalyzeStep('saving_match');

    // Guarantee YYYY-MM-DD regardless of browser locale
    const isoDate = normaliseDateToISO(matchDate);

    try {
      // 1) Создаём запись матча
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          player_id: player.id,
          match_date: isoDate,
          opponent: opponent.trim() || null,
          match_type: matchType,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (matchErr) throw matchErr;

      // 2) Если есть видео и запрошен анализ
      if (withAnalysis && videoFile) {
        setAnalyzing(true);
        setAnalyzeStep('uploading');

        const formData = new FormData();
        formData.append('match_id', match.id);
        formData.append('player_name', player.name);
        if (player.age) formData.append('player_age', String(player.age));
        if (player.position) formData.append('player_position', player.position);
        if (opponent.trim()) formData.append('opponent', opponent.trim());
        formData.append('match_type', matchType);
        formData.append('video', videoFile);

        setAnalyzeStep('analyzing');

        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();

        if (!result.success) {
          console.error('Analysis error:', result.error);
          setError(`Ошибка анализа: ${result.error}. Матч сохранён.`);
        } else {
          setAnalyzeStep('done');
        }

        setAnalyzing(false);
      } else {
        setAnalyzeStep('done');
      }

      await new Promise((r) => setTimeout(r, 700));
      router.push(`/match/${match.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
      setAnalyzeStep('error');
      setSaving(false);
      setAnalyzing(false);
    }
  };

  // ── Shared input class ──
  const inputCls =
    'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors';

  // ── Player form fields (shared between create & edit) ──
  const renderPlayerFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Имя игрока *</label>
        <input
          type="text"
          value={playerForm.name}
          onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
          placeholder="Имя Фамилия"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Возраст</label>
        <input
          type="number"
          value={playerForm.age}
          onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })}
          placeholder="14"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Позиция</label>
        <select
          value={playerForm.position}
          onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
          className={`${inputCls} appearance-none`}
        >
          <option value="" className="bg-[#161b22]">Выберите</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p} className="bg-[#161b22]">{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Клуб</label>
        <input
          type="text"
          value={playerForm.club}
          onChange={(e) => setPlayerForm({ ...playerForm, club: e.target.value })}
          placeholder="Название клуба"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Рост (см)</label>
        <input
          type="number"
          value={playerForm.height}
          onChange={(e) => setPlayerForm({ ...playerForm, height: e.target.value })}
          placeholder="175"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Вес (кг)</label>
        <input
          type="number"
          value={playerForm.weight}
          onChange={(e) => setPlayerForm({ ...playerForm, weight: e.target.value })}
          placeholder="65"
          className={inputCls}
        />
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="font-heading text-3xl md:text-4xl tracking-wider text-white">
            <span className="text-gradient-cyan">Новый матч</span>
          </h1>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* ────────────────────────────────────────────
              Player create form (shown only if NO player exists)
          ──────────────────────────────────────────── */}
          {showPlayerForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-5 md:p-6 space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-cyan-400" />
                <h2 className="font-heading text-lg tracking-wider text-white">
                  Профиль игрока
                </h2>
              </div>

              {renderPlayerFields()}

              <button
                onClick={handleCreatePlayer}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-colors disabled:opacity-50 glow-cyan"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Сохранить игрока
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────
              Player badge (live from DB, clickable to edit)
          ──────────────────────────────────────────── */}
          {playerLoading && !player && (
            <div className="flex items-center gap-3 glass-card px-4 py-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-white/5" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-32 bg-white/5 rounded" />
                <div className="h-3 w-48 bg-white/5 rounded" />
              </div>
            </div>
          )}

          {player && !showPlayerForm && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={openEditModal}
              className="group glass-card px-4 py-3 cursor-pointer card-hover relative overflow-hidden"
              title="Нажмите, чтобы редактировать профиль"
            >
              {/* subtle gradient sweep on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                    {player.position && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/15 text-[11px] font-bold text-cyan-400 border border-cyan-500/20 tracking-wider shrink-0">
                        {player.position}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40 flex-wrap">
                    {player.club && <span>{player.club}</span>}
                    {player.age != null && <span>{player.age} лет</span>}
                    {player.height != null && (
                      <span className="flex items-center gap-0.5">
                        <Ruler className="w-3 h-3" /> {player.height} см
                      </span>
                    )}
                    {player.weight != null && (
                      <span className="flex items-center gap-0.5">
                        <Weight className="w-3 h-3" /> {player.weight} кг
                      </span>
                    )}
                  </div>
                </div>

                <Pencil className="w-4 h-4 text-white/20 group-hover:text-cyan-400 transition-colors shrink-0" />
              </div>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────
              Edit profile modal (overlay)
          ──────────────────────────────────────────── */}
          <AnimatePresence>
            {showEditModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="edit-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => { setShowEditModal(false); setError(''); }}
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                  key="edit-modal"
                  initial={{ opacity: 0, scale: 0.92, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 30 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                  className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-lg glass-card p-5 md:p-6 space-y-5 glow-cyan"
                  style={{ maxHeight: '80vh', overflowY: 'auto' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Pencil className="w-4 h-4 text-cyan-400" />
                      </div>
                      <h2 className="font-heading text-lg tracking-wider text-white">
                        Редактировать профиль
                      </h2>
                    </div>
                    <button
                      onClick={() => { setShowEditModal(false); setError(''); }}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>

                  {/* Error inside modal */}
                  {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Fields */}
                  {renderPlayerFields()}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleUpdatePlayer}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-all disabled:opacity-50 glow-cyan"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : profileSaveSuccess ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {profileSaveSuccess ? 'Сохранено!' : 'Сохранить профиль'}
                    </button>
                    <button
                      onClick={() => { setShowEditModal(false); setError(''); }}
                      className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ────────────────────────────────────────────
              Match form
          ──────────────────────────────────────────── */}
          {player && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div className="glass-card p-5 md:p-6 space-y-4">
                <h2 className="font-heading text-lg tracking-wider text-white/80">
                  Информация о матче
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Дата матча *</label>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={handleDateChange}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Соперник</label>
                    <input
                      type="text"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="Название команды"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Тип матча</label>
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as MatchType)}
                      className={`${inputCls} appearance-none`}
                    >
                      <option value="тренировка" className="bg-[#161b22]">Тренировка</option>
                      <option value="официальный" className="bg-[#161b22]">Официальный</option>
                      <option value="товарищеский" className="bg-[#161b22]">Товарищеский</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Заметки тренера</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Любые наблюдения..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* Media uploader */}
              <div className="glass-card p-5 md:p-6 space-y-4">
                <h2 className="font-heading text-lg tracking-wider text-white/80">
                  Видеозапись
                </h2>
                <p className="text-xs text-white/30">
                  Загрузите видео матча или тренировки. AI проанализирует запись и составит план тренировок.
                </p>
                <MediaUploader
                  onVideoReady={handleVideoReady}
                  maxSizeMB={100}
                  isUploading={saving || analyzing}
                />
              </div>

              {/* Progress indicator */}
              <AnimatePresence>
                {analyzeStep !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                      analyzeStep === 'error'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : analyzeStep === 'done'
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    {analyzeStep !== 'done' && analyzeStep !== 'error' ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : analyzeStep === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <Database className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{STEP_LABELS[analyzeStep]}</span>
                    {analyzeStep === 'analyzing' && (
                      <span className="ml-auto text-xs opacity-60">~30–60 сек</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="btn-analyze"
                  onClick={() => handleSaveMatch(true)}
                  disabled={saving || analyzing || !videoFile}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-cyan-strong"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI-Анализ...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Сохранить и анализировать
                    </>
                  )}
                </button>
                <button
                  id="btn-save-only"
                  onClick={() => handleSaveMatch(false)}
                  disabled={saving || analyzing}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  {saving && !analyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Сохранить без анализа
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </>
  );
}
