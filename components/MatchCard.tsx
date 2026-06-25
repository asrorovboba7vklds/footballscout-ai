'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Match, Player } from '@/types';

interface MatchCardProps {
  match: Match;
  player?: Player;
  analysisScore?: number | null;
}

/** Карточка матча для дашборда */
export default function MatchCard({ match, player, analysisScore }: MatchCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const matchTypeColors: Record<string, string> = {
    'официальный': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'товарищеский': 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30',
    'тренировка': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const typeClass = match.match_type
    ? matchTypeColors[match.match_type] || 'bg-white/10 text-white/60 border-white/10'
    : 'bg-white/10 text-white/60 border-white/10';

  const formattedDate = new Date(match.match_date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Удалить этот матч?')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/delete?type=match&id=${match.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative glass-card p-5 cursor-pointer card-hover overflow-hidden"
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/60">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {match.match_type && (
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${typeClass}`}>
                {match.match_type}
              </span>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
              title="Удалить матч"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              )}
            </button>
          </div>
        </div>

        {/* Opponent */}
        <h3 className="text-lg font-semibold text-white mb-2">
          {match.opponent ? `vs ${match.opponent}` : 'Без соперника'}
        </h3>

        {/* Player info */}
        {player && (
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-white/30" />
            <span className="text-sm text-white/50">{player.name}</span>
            {player.position && (
              <>
                <MapPin className="w-3.5 h-3.5 text-white/30 ml-1" />
                <span className="text-sm text-white/50">{player.position}</span>
              </>
            )}
          </div>
        )}

        {/* Score badge */}
        {analysisScore != null && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/40">Общая оценка</span>
            <div
              className={`ml-auto text-lg font-heading tracking-wider ${
                analysisScore >= 8
                  ? 'text-[#00FF87]'
                  : analysisScore >= 5
                    ? 'text-[#FFD600]'
                    : 'text-[#FF4444]'
              }`}
            >
              {analysisScore}/10
            </div>
          </div>
        )}

        {/* Notes preview */}
        {match.notes && (
          <p className="text-xs text-white/30 mt-2 line-clamp-2">{match.notes}</p>
        )}
      </motion.div>
    </Link>
  );
}
