
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      // Wait until user data is loaded
      return;
    }

    if (user) {
      if (user.isSuperAdmin) {
        // Super Admins go to their admin management page.
        router.replace('/settings/admins');
      } else {
        // All other logged-in users go to their tools dashboard.
        router.replace('/tools');
      }
    } else {
        // If for some reason there's no user and we are here, go to login.
        // AuthContext should usually handle this, but this is a fallback.
        router.replace('/login');
    }
  }, [user, loading, router]);

  // Render a loading state while redirecting
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      <span>Redireccionando...</span>
    </div>
  );
}
