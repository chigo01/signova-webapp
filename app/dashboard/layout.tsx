"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/cookies";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status using token from client-side cookie
    const checkAuth = async () => {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://signova-server.onrender.com";

      const token = getAuthToken();

      if (!token) {
        router.replace("/login");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
