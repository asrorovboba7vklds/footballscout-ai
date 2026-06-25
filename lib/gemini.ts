import { GoogleGenAI } from '@google/genai';

/** Gemini клиент — используется ТОЛЬКО на сервере (API Routes) */
export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
  });
}

/**
 * Модель для анализа.
 * gemini-2.5-flash — быстрая модель Google с поддержкой Vision и Video.
 */
export const GEMINI_MODEL = 'gemini-2.5-flash' as const;

/** Максимальный размер видео (МБ) */
export const MAX_VIDEO_SIZE_MB = 100;
