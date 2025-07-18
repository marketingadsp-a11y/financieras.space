
"use client";
import { AppSettings } from "@/components/settings/app-settings";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Regular admins (who are not super admins) get redirected.
    if (user && !user.isSuperAdmin) {
      router.replace('/settings/company-profile');
    }
  }, [user, router]);

  // SuperAdmins will see the AppSettings component.
  // The redirect will happen for non-super-admins before this is rendered.
  if (!user || !user.isSuperAdmin) {
    // Render nothing or a loader while redirecting
    return null;
  }
  
  return <AppSettings />;
}

