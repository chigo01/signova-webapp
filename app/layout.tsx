import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleOAuthWrapper } from "@/components/google-oauth-provider";
import { golosText } from "@/lib/fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Signova",
    template: "%s · Signova",
  },
  description: "Signova trading platform",
  applicationName: "Signova",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${golosText.variable} antialiased`}
      >
        <GoogleOAuthWrapper>{children}</GoogleOAuthWrapper>
      </body>
    </html>
  );
}
