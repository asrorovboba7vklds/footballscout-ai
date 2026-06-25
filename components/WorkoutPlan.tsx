'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Dumbbell, Clock, Loader2 } from 'lucide-react';
import type { WorkoutExercise, Analysis } from '@/types';
import { getMethodBadgeClass, getMetricLabel } from '@/types';

interface WorkoutPlanProps {
  analysisId: string;
  exercises: WorkoutExercise[];
  onUpdate?: (updated: WorkoutExercise[]) => void;
}

/**
 * Элитный план тренировок — почасовое расписание с бейджами методик.
 */
export default function WorkoutPlan({ analysisId, exercises, onUpdate }: WorkoutPlanProps) {
  const [items, setItems] = useState<WorkoutExercise[]>(exercises);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const handleDeleteExercise = async (index: number) => {
    setDeleting(index);
    try {
      const res = await fetch(
        `/api/delete?type=workout&analysis_id=${analysisId}&index=${index}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        const updated = items.filter((_, i) => i !== index);
        setItems(updated);
        onUpdate?.(updated);
      }
    } catch (err) {
      console.error('Delete exercise error:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await fetch(
        `/api/delete?type=workout_all&analysis_id=${analysisId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setItems([]);
        onUpdate?.([]);
      }
    } catch (err) {
      console.error('Clear all error:', err);
    } finally {
      setClearingAll(false);
    }
  };

  if (items.length === 0) return null;

  const focusColors: Record<string, string> = {
    technique: 'text-cyan-400',
    tactics: 'text-blue-400',
    physical: 'text-orange-400',
    mentality: 'text-yellow-400',
    decision: 'text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="font-heading text-lg tracking-wider text-white">
            Элитный план тренировок
          </h3>
        </div>
        <button
          onClick={handleClearAll}
          disabled={clearingAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          title="Удалить весь план"
        >
          {clearingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Очистить
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 font-medium w-20">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Время
              </th>
              <th className="text-left px-3 py-3 font-medium">Упражнение</th>
              <th className="text-center px-3 py-3 font-medium w-16">Мин</th>
              <th className="text-left px-3 py-3 font-medium">Методика</th>
              <th className="text-left px-3 py-3 font-medium w-24">Фокус</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((exercise, i) => (
              <motion.tr
                key={`${exercise.time}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
              >
                <td className="px-5 py-3 text-cyan-400 font-mono text-xs font-medium">
                  {exercise.time}
                </td>
                <td className="px-3 py-3 text-white/80">
                  {exercise.exercise}
                </td>
                <td className="text-center px-3 py-3 text-white/50">
                  {exercise.duration_min}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${getMethodBadgeClass(exercise.method)}`}>
                    {exercise.method}
                  </span>
                </td>
                <td className={`px-3 py-3 text-xs font-medium ${focusColors[exercise.focus] || 'text-white/50'}`}>
                  {getMetricLabel(exercise.focus)}
                </td>
                <td className="px-2 py-3">
                  <button
                    onClick={() => handleDeleteExercise(i)}
                    disabled={deleting === i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    title="Удалить упражнение"
                  >
                    {deleting === i ? (
                      <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
