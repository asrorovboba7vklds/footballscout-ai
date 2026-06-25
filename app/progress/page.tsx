'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProgressChart from '@/components/ProgressChart';
import { supabase } from '@/lib/supabase';
import type { ProgressDataPoint } from '@/types';

export default function ProgressPage() {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    async function fetchProgress() {
      try {
        // Получаем первого игрока
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .limit(1)
          .order('created_at', { ascending: true });

        const player = players?.[0];
        if (!player) {
          setLoading(false);
          return;
        }
        setPlayerName(player.name);

        // Получаем все матчи этого игрока
        const { data: matches } = await supabase
          .from('matches')
          .select('*')
          .eq('player_id', player.id)
          .order('match_date', { ascending: true });

        if (!matches || matches.length === 0) {
          setLoading(false);
          return;
        }

        // Получаем все анализы
        const { data: analyses } = await supabase
          .from('analyses')
          .select('*');

        if (!analyses || analyses.length === 0) {
          setLoading(false);
          return;
        }

        // Собираем ProgressDataPoint для каждого матча, у которого есть анализ
        const progressData: ProgressDataPoint[] = [];

        for (const match of matches) {
          const matchAnalyses = analyses.filter((a) => a.match_id === match.id);
          if (matchAnalyses.length === 0) continue;

          // Берём последний анализ по дате
          const latest = matchAnalyses.sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          )[0];

          progressData.push({
            date: match.match_date,
            opponent: match.opponent,
            technique: latest.technique_score,
            tactics: latest.tactics_score,
            physical: latest.physical_score,
            mentality: latest.mentality_score,
            decision: latest.decision_score,
            overall: latest.overall_score,
          });
        }

        setData(progressData);
      } catch (err) {
        console.error('Progress fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="font-heading text-3xl md:text-4xl tracking-wider text-white">
              <span className="text-white/50">Прогресс ·</span>{' '}
              <span className="text-gradient-green">
                {playerName || 'Игрок'}
              </span>
            </h1>
            <p className="text-sm text-white/40 mt-1">
              Динамика оценок по всем матчам
            </p>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 flex items-center justify-center animate-pulse">
                  <Activity className="w-6 h-6 text-[#00FF87]" />
                </div>
                <p className="text-sm text-white/40">Загрузка данных...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                <TrendingUp className="w-8 h-8 text-white/20" />
              </div>
              <h2 className="font-heading text-xl tracking-wider text-white/60 mb-2">
                Нет данных для графика
              </h2>
              <p className="text-sm text-white/30">
                Добавьте матчи и запустите AI-анализ, чтобы увидеть прогресс
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#12121A] border border-white/5 p-4 md:p-6">
              <ProgressChart data={data} />
            </div>
          )}

          {/* Summary table */}
          {data.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-[#12121A] border border-white/5 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="font-heading text-lg tracking-wider text-white/80">
                  История оценок
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs border-b border-white/5">
                      <th className="text-left px-5 py-3 font-medium">Дата</th>
                      <th className="text-left px-3 py-3 font-medium">Соперник</th>
                      <th className="text-center px-3 py-3 font-medium">ТЕХ</th>
                      <th className="text-center px-3 py-3 font-medium">ТАК</th>
                      <th className="text-center px-3 py-3 font-medium">ФИЗ</th>
                      <th className="text-center px-3 py-3 font-medium">МЕН</th>
                      <th className="text-center px-3 py-3 font-medium">РЕШ</th>
                      <th className="text-center px-3 py-3 font-medium">ОБЩ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 text-white/60">
                          {new Date(row.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-3 py-3 text-white/80">
                          {row.opponent || '—'}
                        </td>
                        <ScoreCell value={row.technique} />
                        <ScoreCell value={row.tactics} />
                        <ScoreCell value={row.physical} />
                        <ScoreCell value={row.mentality} />
                        <ScoreCell value={row.decision} />
                        <ScoreCell value={row.overall} bold />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </>
  );
}

function ScoreCell({ value, bold }: { value: number; bold?: boolean }) {
  const color =
    value >= 8 ? '#00FF87' : value >= 5 ? '#FFD600' : '#FF4444';
  return (
    <td className="text-center px-3 py-3">
      <span
        className={`${bold ? 'font-heading text-base tracking-wider' : 'text-sm'}`}
        style={{ color }}
      >
        {value}
      </span>
    </td>
  );
}
