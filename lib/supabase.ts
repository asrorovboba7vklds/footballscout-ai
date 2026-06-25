import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase-клиент для использования на клиенте (browser) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase-клиент с service role key — ТОЛЬКО для серверных API Routes.
 * Имеет полный доступ в обход RLS.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}
