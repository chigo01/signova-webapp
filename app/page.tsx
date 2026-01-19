"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "https://signova-server.onrender.com";

    // Check auth status via server (httpOnly cookie can't be read client-side)
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          credentials: "include",
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
