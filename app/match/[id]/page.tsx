'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  FileText,
  Activity,
  Loader2,
  Zap,
  Trash2,
  Ruler,
  Weight,
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AnalysisCard from '@/components/AnalysisCard';
import { supabase } from '@/lib/supabase';
import type { Match, Player, Analysis, Media } from '@/types';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchMatch() {
      try {
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (!matchData) {
          setLoading(false);
          return;
        }
        setMatch(matchData);

        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', matchData.player_id)
          .single();

        setPlayer(playerData || null);

        const { data: analysesData } = await supabase
          .from('analyses')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (analysesData && analysesData.length > 0) {
          setAnalysis(analysesData[0]);
        }

        const { data: mediaData } = await supabase
          .from('media')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        setMedia(mediaData || []);
      } catch (err) {
        console.error('Error fetching match:', err);
      } finally {
        setLoading(false);
      }
    }

    if (matchId) fetchMatch();
  }, [matchId]);

  const matchTypeLabels: Record<string, { text: string; class: string }> = {
    'официальный': { text: 'Официальный', class: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    'товарищеский': { text: 'Товарищеский', class: 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30' },
    'тренировка': { text: 'Тренировка', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  };

  const handleDeleteMatch = async () => {
    if (!confirm('Удалить этот матч и все связанные данные?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/delete?type=match&id=${matchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/');
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center animate-pulse">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm text-white/40">Загрузка...</p>
          </div>
        </main>
      </>
    );
  }

  if (!match) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-heading text-2xl text-white/60 mb-4">Матч не найден</h1>
            <Link href="/" className="text-sm text-cyan-400 hover:underline">
              ← Вернуться на дашборд
            </Link>
          </div>
        </main>
      </>
    );
  }

  const formattedDate = new Date(match.match_date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const typeInfo = match.match_type ? matchTypeLabels[match.match_type] : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Link>

          {/* Player card */}
          {player && (
            <div className="glass-card p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/10">
                  <Users className="w-7 h-7 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">{player.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/40 mt-1">
                    {player.position && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {player.position}
                      </span>
                    )}
                    {player.age && <span>{player.age} лет</span>}
                    {player.height && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3.5 h-3.5" /> {player.height} см
                      </span>
                    )}
                    {player.weight && (
                      <span className="flex items-center gap-1">
                        <Weight className="w-3.5 h-3.5" /> {player.weight} кг
                      </span>
                    )}
                    {player.club && <span>· {player.club}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Match header */}
          <div className="glass-card p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-3">
                <h1 className="font-heading text-2xl md:text-3xl tracking-wider text-white">
                  {match.opponent ? `vs ${match.opponent}` : 'Матч'}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formattedDate}
                  </div>
                </div>

                {typeInfo && (
                  <span
                    className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${typeInfo.class}`}
                  >
                    {typeInfo.text}
                  </span>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={handleDeleteMatch}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Удалить матч
              </button>
            </div>

            {match.notes && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-xs text-white/30 mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Заметки
                </div>
                <p className="text-sm text-white/60">{match.notes}</p>
              </div>
            )}
          </div>

          {/* Media gallery */}
          {media.length > 0 && (
            <div className="glass-card p-5 md:p-6">
              <h2 className="font-heading text-lg tracking-wider text-white/80 mb-4">
                Медиафайлы ({media.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {media.map((m) => (
                  <a
                    key={m.id}
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-video rounded-xl overflow-hidden bg-white/5 hover:ring-2 hover:ring-cyan-500/30 transition-all"
                  >
                    {m.file_type === 'image' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.file_url}
                        alt={m.file_name || 'Media'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/30 gap-2">
                        <Activity className="w-8 h-8" />
                        <span className="text-xs">{m.file_name || 'Видео'}</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          {analysis ? (
            <div>
              <h2 className="font-heading text-xl tracking-wider text-white/80 mb-4">
                AI-Анализ
              </h2>
              <AnalysisCard analysis={analysis} />
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-white/20" />
              </div>
              <h3 className="font-heading text-lg tracking-wider text-white/50 mb-2">
                Анализ не выполнен
              </h3>
              <p className="text-sm text-white/30">
                Загрузите видео и запустите AI-анализ для получения оценок
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </>
  );
}
