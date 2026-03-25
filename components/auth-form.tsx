"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useGoogleLogin } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleIcon from "@/assets/icons/Social/google.svg";
import { setAuthUserProfile } from "@/lib/auth-user";

interface AuthFormProps {
  type: "login" | "register";
}

export function AuthForm({ type }: AuthFormProps) {
  const [step, setStep] = React.useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://web-server-4gpe.onrender.com";

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });

        if (!res.ok) {
          throw new Error("Google login failed");
        }

        const data = await res.json();

        if (data.user) {
          setAuthUserProfile(data.user);
        }

        const isProduction = window.location.protocol === "https:";
        const maxAge = 7 * 24 * 60 * 60;
        document.cookie = `auth_token=${data.token}; path=/; max-age=${maxAge}${
          isProduction ? "; secure" : ""
        }; samesite=lax`;

        window.location.href = "/";
      } catch (error) {
        console.error(error);
        alert("Google login failed. Please try again.");
      }
    },
    onError: () => alert("Google login failed. Please try again."),
  });

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          name:
            type === "register"
              ? (document.getElementById("name") as HTMLInputElement)?.value
              : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send OTP");
      }

      setStep("otp");
    } catch (error) {
      console.error(error);
      alert("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        throw new Error("Invalid OTP");
      }

      const data = await res.json();
      console.log("Logged in:", data);

      if (data.user) {
        setAuthUserProfile(data.user);
      }

      // Save token in cookie
      const isProduction = window.location.protocol === "https:";
      const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
      document.cookie = `auth_token=${data.token}; path=/; max-age=${maxAge}${
        isProduction ? "; secure" : ""
      }; samesite=lax`;

      // Force reload to update auth state
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-10 flex w-full flex-col justify-center space-y-6">
      <div className="flex flex-col space-y-2 text-start">
        <h1 className="text-4xl font-semibold tracking-tight bg-linear-to-r from-white via-[#A3A3A3] to-white bg-clip-text text-transparent">
          {type === "login" ? "Welcome back!" : "Create an account"}
        </h1>
        <p className="text-start text-sm text-zinc-500 dark:text-zinc-400">
          {type === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-white underline underline-offset-4 hover:text-primary"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6">
        {step === "email" ? (
          <form onSubmit={onEmailSubmit}>
            <div className="grid gap-4">
              {type === "register" && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    autoCorrect="off"
                    disabled={isLoading}
                    required
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {type === "login" ? "Login" : "Sign Up"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={onOtpSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isLoading}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <p className="text-xs text-zinc-500">
                  Sent to <span className="font-medium">{email}</span>
                </p>
              </div>
              <Button disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Code
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
                disabled={isLoading}
                type="button"
              >
                Back to Email
              </Button>
            </div>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              Or continue with
            </span>
          </div>
        </div>
        <div className="w-full flex justify-center space-x-4">
          <Button
            className="w-full"
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => googleLogin()}
          >
            <Image
              src={GoogleIcon}
              alt="Google"
              width={20}
              height={20}
              className="mr-2"
            />
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}
