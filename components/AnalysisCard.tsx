'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Lightbulb, MapPin } from 'lucide-react';
import type { Analysis } from '@/types';
import { getScoreHex } from '@/types';
import ScoreRadar from './ScoreRadar';
import WorkoutPlan from './WorkoutPlan';

interface AnalysisCardProps {
  analysis: Analysis;
}

function ProgressBar({ label, score }: { label: string; score: number }) {
  const color = getScoreHex(score);
  const pct = (score / 10) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-sm font-heading tracking-wider" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

function TrendIcon({ score }: { score: number }) {
  if (score >= 8) return <TrendingUp className="w-4 h-4 text-[#00FF87]" />;
  if (score >= 5) return <Minus className="w-4 h-4 text-[#FFD600]" />;
  return <TrendingDown className="w-4 h-4 text-[#FF4444]" />;
}

/** Карточка с результатами AI-анализа */
export default function AnalysisCard({ analysis }: AnalysisCardProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Overall score + Radar */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-lg tracking-wider text-white/80 mb-4">
            Профиль игрока
          </h3>
          <ScoreRadar analysis={analysis} />
        </div>

        {/* Score breakdown with progress bars */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading text-lg tracking-wider text-white/80">
              Метрики
            </h3>
            <div className="flex items-center gap-2">
              <TrendIcon score={analysis.overall_score} />
              <span
                className="text-3xl font-heading tracking-wider"
                style={{ color: getScoreHex(analysis.overall_score) }}
              >
                {analysis.overall_score}
              </span>
              <span className="text-sm text-white/30">/10</span>
            </div>
          </div>
          <div className="space-y-4">
            <ProgressBar label="Техника" score={analysis.technique_score} />
            <ProgressBar label="Тактика" score={analysis.tactics_score} />
            <ProgressBar label="Физика" score={analysis.physical_score} />
            <ProgressBar label="Ментальность" score={analysis.mentality_score} />
            <ProgressBar label="Принятие решений" score={analysis.decision_score} />
          </div>
        </div>
      </motion.div>

      {/* Strengths, Weaknesses, Recommendations */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strengths */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#00FF87]" />
            <h4 className="font-heading text-base tracking-wider text-[#00FF87]">
              Сильные стороны
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] mt-1.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#FFD600]" />
            <h4 className="font-heading text-base tracking-wider text-[#FFD600]">
              Слабые стороны
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600] mt-1.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-cyan-400" />
            <h4 className="font-heading text-base tracking-wider text-cyan-400">
              Рекомендации
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Position recommendation */}
      {analysis.position_recommendation && (
        <motion.div
          variants={item}
          className="glass-card p-5 glow-cyan"
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <h4 className="font-heading text-base tracking-wider text-cyan-400">
              Рекомендуемая позиция
            </h4>
          </div>
          <p className="text-white/80 text-sm">
            {analysis.position_recommendation}
          </p>
        </motion.div>
      )}

      {/* Workout Plan */}
      {analysis.workout_plan && analysis.workout_plan.length > 0 && (
        <motion.div variants={item}>
          <WorkoutPlan
            analysisId={analysis.id}
            exercises={analysis.workout_plan}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
