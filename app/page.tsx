"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    // Everyone goes to the dashboard. Authenticated users see the full
    // experience; guests see gated guest mode (the dashboard prompts login at
    // payoff actions). No more forced bounce to /login.
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Redirecting...</div>
    </div>
  );
};

export default Page;
