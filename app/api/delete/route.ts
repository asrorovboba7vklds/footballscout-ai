/**
 * DELETE /api/delete — удаление данных из Supabase
 *
 * Query params:
 *   type=match&id=xxx     — удалить матч (каскадно удалит analyses/media)
 *   type=analysis&id=xxx  — удалить анализ
 *   type=workout&analysis_id=xxx&index=N — удалить упражнение из workout_plan
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const analysisId = searchParams.get('analysis_id');
  const index = searchParams.get('index');

  const supabase = createServiceClient();

  try {
    switch (type) {
      case 'match': {
        if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });

        const { error } = await supabase
          .from('matches')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Матч удалён' });
      }

      case 'analysis': {
        if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });

        const { error } = await supabase
          .from('analyses')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Анализ удалён' });
      }

      case 'workout': {
        if (!analysisId) return NextResponse.json({ error: 'analysis_id обязателен' }, { status: 400 });
        if (index === null) return NextResponse.json({ error: 'index обязателен' }, { status: 400 });

        const idx = parseInt(index, 10);

        // Получаем текущий workout_plan
        const { data: analysis, error: fetchError } = await supabase
          .from('analyses')
          .select('workout_plan')
          .eq('id', analysisId)
          .single();

        if (fetchError || !analysis) throw fetchError || new Error('Анализ не найден');

        const plan = (analysis.workout_plan as unknown[]) || [];
        if (idx < 0 || idx >= plan.length) {
          return NextResponse.json({ error: 'Неверный индекс' }, { status: 400 });
        }

        // Удаляем элемент по индексу
        plan.splice(idx, 1);

        const { error: updateError } = await supabase
          .from('analyses')
          .update({ workout_plan: plan })
          .eq('id', analysisId);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: 'Упражнение удалено', workout_plan: plan });
      }

      case 'workout_all': {
        if (!analysisId) return NextResponse.json({ error: 'analysis_id обязателен' }, { status: 400 });

        const { error } = await supabase
          .from('analyses')
          .update({ workout_plan: [] })
          .eq('id', analysisId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'План тренировок очищен' });
      }

      default:
        return NextResponse.json(
          { error: `Неизвестный тип: ${type}. Допустимые: match, analysis, workout, workout_all` },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления';
    console.error('[delete] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
