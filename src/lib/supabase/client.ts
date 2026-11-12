import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvvkejytqbudqgjaqxur.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dmtlanl0cWJ1ZHFnamFxeHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTQ3NzAsImV4cCI6MjEwNjI5MDc3MH0.e3_BXq0rhe1M547TPFX7fBrXAYf_fVwbQ57mPNaU81s';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
