"use client";

import { AuthProvider, useAuthState } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MobileHeader } from "@/components/dashboard/mobile-header";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthState();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Render for everyone — guests browse in a gated read-only mode, the auth
  // state drives per-feature gating downstream (LockedOverlay / requireAuth).
  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-64">
        <MobileHeader />
        <div className="flex min-h-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
