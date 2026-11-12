import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvvkejytqbudqgjaqxur.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dmtlanl0cWJ1ZHFnamFxeHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTQ3NzAsImV4cCI6MjEwNjI5MDc3MH0.e3_BXq0rhe1M547TPFX7fBrXAYf_fVwbQ57mPNaU81s';

// Allow system / custom enterprise CA in development environments
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
