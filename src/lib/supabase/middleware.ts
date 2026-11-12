import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvvkejytqbudqgjaqxur.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dmtlanl0cWJ1ZHFnamFxeHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTQ3NzAsImV4cCI6MjEwNjI5MDc3MH0.e3_BXq0rhe1M547TPFX7fBrXAYf_fVwbQ57mPNaU81s';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do NOT run code between createServerClient and supabase.auth.getUser().
  // getUser() sends a network request to authenticate the token against Supabase Auth servers.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect detailed pages: /strategies, /reports, /vst
  const isProtectedPath =
    pathname.startsWith('/strategies') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/vst');

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // If already logged in, redirect away from /login
  if (pathname === '/login' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
    const url = new URL(redirectTo, request.url);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
