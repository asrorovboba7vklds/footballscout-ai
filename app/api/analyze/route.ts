/**
 * POST /api/analyze — AI-анализ видео через Google Gemini + File API
 *
 * Принимает FormData с видеофайлом,
 * загружает его в Google Cloud через File API,
 * передаёт в Gemini 2.5 Flash для анализа,
 * парсит JSON-ответ и сохраняет результат в таблицу analyses.
 */
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createGeminiClient, GEMINI_MODEL, MAX_VIDEO_SIZE_MB } from '@/lib/gemini';
import { FOOTBALL_SCOUT_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';
import { createServiceClient } from '@/lib/supabase';
import type {
  AnalyzeResponsePayload,
  GeminiAnalysisResponse,
} from '@/types';

// Route Segment Config
export const maxDuration = 120; // секунд (видео-обработка дольше)
export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'match-media';

/**
 * Пытается распарсить JSON из ответа Gemini.
 */
function parseGeminiJson(raw: string): GeminiAnalysisResponse {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as GeminiAnalysisResponse;

  const requiredScores = [
    'technique_score',
    'tactics_score',
    'physical_score',
    'mentality_score',
    'decision_score',
    'overall_score',
  ] as const;

  for (const key of requiredScores) {
    const val = parsed[key];
    if (typeof val !== 'number' || val < 1 || val > 10) {
      throw new Error(`Невалидное значение для ${key}: ${val}`);
    }
  }

  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];
  if (!Array.isArray(parsed.workout_plan)) parsed.workout_plan = [];

  return parsed;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalyzeResponsePayload>> {
  let tmpPath: string | null = null;
  let googleFileName: string | null = null;
  const genai = createGeminiClient();

  try {
    const formData = await request.formData();

    const matchId = formData.get('match_id') as string;
    const playerName = formData.get('player_name') as string;
    const playerAge = formData.get('player_age') ? Number(formData.get('player_age')) : null;
    const playerPosition = formData.get('player_position') as string | null;
    const opponent = formData.get('opponent') as string | null;
    const matchType = formData.get('match_type') as string | null;
    const videoFile = formData.get('video') as File | null;

    // ---- Валидация ----
    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'match_id обязателен' },
        { status: 400 }
      );
    }
    if (!playerName) {
      return NextResponse.json(
        { success: false, error: 'player_name обязателен' },
        { status: 400 }
      );
    }
    if (!videoFile || videoFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Видеофайл обязателен' },
        { status: 400 }
      );
    }

    const sizeMB = videoFile.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      return NextResponse.json(
        { success: false, error: `Видео слишком большое (${sizeMB.toFixed(1)}МБ). Максимум ${MAX_VIDEO_SIZE_MB}МБ` },
        { status: 400 }
      );
    }

    // ---- Проверяем GEMINI_API_KEY ----
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY не настроен' },
        { status: 500 }
      );
    }

    // ---- 1. Сохраняем видео во временный файл ----
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const ext = videoFile.name.endsWith('.mov') ? '.mov' : '.mp4';
    const tmpName = `video_${randomUUID()}${ext}`;
    tmpPath = join(tmpdir(), tmpName);
    await writeFile(tmpPath, videoBuffer);

    console.log(`[analyze] Saved video to ${tmpPath} (${sizeMB.toFixed(1)}MB)`);

    // ---- 2. Параллельно: загружаем в Supabase Storage ----
    const supabase = createServiceClient();
    const storagePath = `${matchId}/${tmpName}`;

    const storagePromise = (async () => {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, videoBuffer, {
            contentType: `video/${ext === '.mov' ? 'quicktime' : 'mp4'}`,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('[analyze] Storage upload error:', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        await supabase.from('media').insert({
          match_id: matchId,
          file_url: urlData.publicUrl,
          file_type: 'video',
          file_name: videoFile.name,
        });

        console.log('[analyze] ✓ Video uploaded to Supabase Storage');
      } catch (err) {
        console.error('[analyze] Storage upload failed:', err);
      }
    })();

    // ---- 3. Загружаем видео в Google File API ----
    console.log(`[analyze] Uploading video to Google File API...`);

    const uploadedFile = await genai.files.upload({
      file: tmpPath,
      config: {
        mimeType: `video/${ext === '.mov' ? 'quicktime' : 'mp4'}`,
      },
    });

    googleFileName = uploadedFile.name!;
    console.log(`[analyze] ✓ Uploaded to Google: ${googleFileName}`);

    // ---- 4. Ждём пока файл станет ACTIVE ----
    let fileState = uploadedFile.state;
    let pollCount = 0;
    const MAX_POLLS = 30;

    while (fileState === 'PROCESSING' && pollCount < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, 2000));
      const fileInfo = await genai.files.get({ name: googleFileName });
      fileState = fileInfo.state;
      pollCount++;
      console.log(`[analyze] File state: ${fileState} (poll ${pollCount})`);
    }

    if (fileState !== 'ACTIVE') {
      throw new Error(`Файл не стал активным (state: ${fileState})`);
    }

    // ---- 5. Запрос к Gemini Vision ----
    const userPromptText = buildUserPrompt({
      playerName,
      playerAge,
      playerPosition,
      opponent,
      matchType,
    });

    const fullPrompt = `${FOOTBALL_SCOUT_SYSTEM_PROMPT}\n\n${userPromptText}`;

    console.log(`[analyze] Sending video to Gemini (${GEMINI_MODEL}) for match ${matchId}`);

    const response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: uploadedFile.uri!,
                mimeType: uploadedFile.mimeType!,
              },
            },
            { text: fullPrompt },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    // ---- 6. Парсим ответ ----
    const rawResponse = response.text ?? '';

    if (!rawResponse) {
      throw new Error('Gemini не вернул текстовый ответ');
    }

    console.log('[analyze] Gemini raw response length:', rawResponse.length);

    const analysisData = parseGeminiJson(rawResponse);

    // ---- 7. Дожидаемся загрузки в Storage ----
    await storagePromise;

    // ---- 8. Сохраняем анализ в БД ----
    const { data: analysisRecord, error: dbError } = await supabase
      .from('analyses')
      .insert({
        match_id: matchId,
        raw_response: rawResponse,
        technique_score: analysisData.technique_score,
        tactics_score: analysisData.tactics_score,
        physical_score: analysisData.physical_score,
        mentality_score: analysisData.mentality_score,
        decision_score: analysisData.decision_score,
        overall_score: analysisData.overall_score,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
        recommendations: analysisData.recommendations,
        position_recommendation: analysisData.position_recommendation || null,
        workout_plan: analysisData.workout_plan || [],
      })
      .select()
      .single();

    if (dbError) {
      console.error('[analyze] DB insert error:', dbError);
      return NextResponse.json(
        { success: false, error: `Ошибка сохранения в БД: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log(
      `[analyze] ✓ Analysis saved id=${analysisRecord.id}, overall=${analysisData.overall_score}/10`
    );

    return NextResponse.json({
      success: true,
      analysis: analysisRecord,
    });
  } catch (err) {
    console.error('[analyze] Unhandled error:', err);

    const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
    const isQuota = message.toLowerCase().includes('quota') || message.includes('429');
    const isAuth = message.includes('API_KEY') || message.includes('401') || message.includes('403');

    let userMessage = message;
    if (isAuth) userMessage = 'Неверный GEMINI_API_KEY. Проверьте ключ на aistudio.google.com';
    if (isQuota) userMessage = 'Превышен лимит запросов Gemini API. Попробуйте позже.';

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    );
  } finally {
    // ---- Cleanup: удаляем tmp файл ----
    if (tmpPath) {
      try { await unlink(tmpPath); } catch { /* ignore */ }
    }
    // ---- Cleanup: удаляем файл из Google Cloud ----
    if (googleFileName) {
      try {
        await genai.files.delete({ name: googleFileName });
        console.log(`[analyze] ✓ Deleted Google file: ${googleFileName}`);
      } catch { /* ignore */ }
    }
  }
}
