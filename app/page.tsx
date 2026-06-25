'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  PlusCircle,
  TrendingUp,
  Zap,
  BarChart3,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MatchCard from '@/components/MatchCard';
import { supabase } from '@/lib/supabase';
import type { Match, Player, Analysis } from '@/types';

interface MatchWithAnalysis {
  match: Match;
  player?: Player;
  latestScore?: number | null;
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchWithAnalysis[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    avgScore: 0,
    bestScore: 0,
    lastAnalysisDate: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Загрузить первого игрока
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .limit(1)
          .order('created_at', { ascending: true });

        const currentPlayer = players?.[0] || null;
        setPlayer(currentPlayer);

        if (!currentPlayer) {
          setLoading(false);
          return;
        }

        // Загрузить матчи
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .eq('player_id', currentPlayer.id)
          .order('match_date', { ascending: false })
          .limit(20);

        // Загрузить анализы
        const { data: analysesData } = await supabase
          .from('analyses')
          .select('*');

        const analysesMap = new Map<string, Analysis>();
        if (analysesData) {
          for (const a of analysesData) {
            if (!analysesMap.has(a.match_id) || a.created_at > analysesMap.get(a.match_id)!.created_at) {
              analysesMap.set(a.match_id, a);
            }
          }
        }

        const enrichedMatches: MatchWithAnalysis[] = (matchesData || []).map((m) => ({
          match: m,
          player: currentPlayer,
          latestScore: analysesMap.get(m.id)?.overall_score ?? null,
        }));

        setMatches(enrichedMatches);

        // Статистика
        const scores = Array.from(analysesMap.values()).map((a) => a.overall_score);
        setStats({
          totalMatches: matchesData?.length || 0,
          avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
          bestScore: scores.length ? Math.max(...scores) : 0,
          lastAnalysisDate: analysesData?.length
            ? new Date(
                analysesData.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
              ).toLocaleDateString('ru-RU')
            : '—',
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    {
      label: 'Матчей',
      value: stats.totalMatches,
      icon: BarChart3,
      color: '#06b6d4',
    },
    {
      label: 'Средний балл',
      value: stats.avgScore || '—',
      icon: Target,
      color: '#3b82f6',
    },
    {
      label: 'Лучший балл',
      value: stats.bestScore || '—',
      icon: TrendingUp,
      color: '#00FF87',
    },
    {
      label: 'Последний анализ',
      value: stats.lastAnalysisDate,
      icon: Zap,
      color: '#FFD600',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-6 max-w-7xl mx-auto">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl tracking-wider text-white">
                {player ? (
                  <>
                    <span className="text-white/50">Дашборд ·</span>{' '}
                    <span className="text-gradient-cyan">{player.name}</span>
                  </>
                ) : (
                  'FootballScout AI'
                )}
              </h1>
              {player && (
                <p className="text-sm text-white/40 mt-1">
                  {player.position && <span>{player.position}</span>}
                  {player.club && <span> · {player.club}</span>}
                  {player.age && <span> · {player.age} лет</span>}
                </p>
              )}
            </div>
            <Link
              href="/match/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-colors glow-cyan-strong"
            >
              <PlusCircle className="w-4 h-4" />
              Новый матч
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((s, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2 }}
                className="glass-card p-4 md:p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-xs text-white/40">{s.label}</span>
                </div>
                <p
                  className="text-2xl md:text-3xl font-heading tracking-wider"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Empty state or match list */}
          {loading ? (
            <motion.div variants={item} className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center animate-pulse">
                  <Activity className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-sm text-white/40">Загрузка...</p>
              </div>
            </motion.div>
          ) : !player ? (
            <motion.div variants={item} className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Activity className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="font-heading text-2xl tracking-wider text-white mb-2">
                Добро пожаловать в FootballScout AI
              </h2>
              <p className="text-sm text-white/40 max-w-md mb-6">
                Начните с создания профиля игрока и добавления первого матча для
                AI-анализа.
              </p>
              <Link
                href="/match/new"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-colors glow-cyan-strong"
              >
                <PlusCircle className="w-5 h-5" />
                Создать первый матч
              </Link>
            </motion.div>
          ) : matches.length === 0 ? (
            <motion.div variants={item} className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                <BarChart3 className="w-8 h-8 text-white/20" />
              </div>
              <h2 className="font-heading text-xl tracking-wider text-white/60 mb-2">
                Нет матчей
              </h2>
              <p className="text-sm text-white/30 mb-6">
                Добавьте первый матч для начала анализа
              </p>
              <Link
                href="/match/new"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-400 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Добавить матч
              </Link>
            </motion.div>
          ) : (
            <motion.div variants={item}>
              <h2 className="font-heading text-xl tracking-wider text-white/60 mb-4">
                Последние матчи
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((m, i) => (
                  <motion.div
                    key={m.match.id}
                    variants={item}
                    custom={i}
                  >
                    <MatchCard
                      match={m.match}
                      player={m.player}
                      analysisScore={m.latestScore}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </>
  );
}
