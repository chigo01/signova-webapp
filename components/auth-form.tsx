"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  type: "login" | "register";
}

export function AuthForm({ type }: AuthFormProps) {
  const [step, setStep] = React.useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3001/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("http://localhost:3001/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        throw new Error("Invalid OTP");
      }

      const data = await res.json();
      console.log("Logged in:", data);

      // Force reload to update auth state (cookie is set)
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {type === "login" ? "Welcome back" : "Create an account"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {step === "email"
            ? type === "login"
              ? "Enter your email below to sign in"
              : "Enter your email below to create your account"
            : "Enter the code sent to your email"}
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
                {type === "login" ? "Sign In with Email" : "Sign Up with Email"}
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
        <Button variant="outline" type="button" disabled={true}>
          {/* Simple Google Icon placeholder or SVG */}
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            ></path>
          </svg>
          Google
        </Button>
      </div>

      <p className="px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {type === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="underline underline-offset-4 hover:text-primary"
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
  );
}
