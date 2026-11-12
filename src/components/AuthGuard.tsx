'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 transition-colors">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2.5" />
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          安全驗證中，未登入將自動轉向登入頁面...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
