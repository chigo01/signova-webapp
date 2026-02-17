"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "84768218606-8g4duno6gm7o4p0meh91kgnee99ldae2.apps.googleusercontent.com";

export function GoogleOAuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
