/**
 * POST /api/upload — Загрузка медиафайлов в Supabase Storage
 *
 * Принимает base64-кодированный файл, загружает его в bucket 'match-media'
 * и сохраняет запись в таблицу media.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import type { UploadRequestPayload, UploadResponsePayload } from '@/types';

// Route Segment Config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/** Максимальный размер файла — 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Bucket name в Supabase Storage */
const BUCKET_NAME = 'match-media';

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponsePayload>> {
  try {
    const body = (await request.json()) as UploadRequestPayload;

    // ---- Валидация ----
    if (!body.match_id) {
      return NextResponse.json(
        { success: false, error: 'match_id обязателен' },
        { status: 400 }
      );
    }

    if (!body.file_base64) {
      return NextResponse.json(
        { success: false, error: 'file_base64 обязателен' },
        { status: 400 }
      );
    }

    if (!['image', 'video'].includes(body.file_type)) {
      return NextResponse.json(
        { success: false, error: 'file_type должен быть "image" или "video"' },
        { status: 400 }
      );
    }

    // ---- Декодирование base64 ----
    // Удаляем префикс data URL если есть (data:image/jpeg;base64,...)
    const base64Data = body.file_base64.replace(
      /^data:[a-zA-Z0-9/+.-]+;base64,/,
      ''
    );

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    // ---- Определяем content type ----
    const extensionMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
    };

    const fileName = body.file_name || `file_${Date.now()}`;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = extensionMap[ext] || 'application/octet-stream';

    // ---- Генерируем уникальный путь в storage ----
    const storagePath = `${body.match_id}/${Date.now()}_${fileName}`;

    // ---- Загрузка в Supabase Storage ----
    const supabase = createServiceClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Ошибка загрузки: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // ---- Получаем публичный URL ----
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    // ---- Сохраняем запись в таблицу media ----
    const { data: mediaRecord, error: dbError } = await supabase
      .from('media')
      .insert({
        match_id: body.match_id,
        file_url: fileUrl,
        file_type: body.file_type,
        file_name: fileName,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { success: false, error: `Ошибка БД: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media: mediaRecord,
    });
  } catch (err) {
    console.error('Upload API error:', err);
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
