"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/cookies";
import { API_URL } from "@/lib/config";

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    // Check auth status using token from client-side cookie
    const checkAuth = async () => {
      const token = getAuthToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Redirecting...</div>
    </div>
  );
};

export default Page;
