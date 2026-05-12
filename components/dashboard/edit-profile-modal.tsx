"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";
import {
  AVATAR_JPEG_QUALITY,
  AVATAR_MAX_DATA_URL_LENGTH,
  AVATAR_OUTPUT_SIZE,
  NAME_MAX,
  PROFILE_ROLES,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from "@/lib/profile";
import { AuthUserProfile, setAuthUserProfile } from "@/lib/auth-user";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  initial: AuthUserProfile;
  onSaved: (user: AuthUserProfile) => void;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function resizeImageToDataUrl(file: File): Promise<string> {
  const fileUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = fileUrl;
    });

    const size = AVATAR_OUTPUT_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");

    const sourceSize = Math.min(img.width, img.height);
    const sx = (img.width - sourceSize) / 2;
    const sy = (img.height - sourceSize) / 2;
    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}

export function EditProfileModal({
  open,
  onClose,
  initial,
  onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(initial.name ?? "");
  const [username, setUsername] = useState(initial.username ?? "");
  const [role, setRole] = useState(initial.role ?? "");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(
    initial.avatarDataUrl
  );
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial.name ?? "");
      setUsername(initial.username ?? "");
      setRole(initial.role ?? "");
      setAvatarDataUrl(initial.avatarDataUrl);
      setUsernameError(null);
      setFormError(null);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const avatarInitials = useMemo(() => initialsFromName(name || "?"), [name]);

  function validateBeforeSubmit(): boolean {
    setUsernameError(null);
    setFormError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > NAME_MAX) {
      setFormError(`Name must be 1-${NAME_MAX} characters`);
      return false;
    }

    if (username.trim().length > 0) {
      const normalized = username.trim().toLowerCase();
      if (!USERNAME_REGEX.test(normalized)) {
        setUsernameError(
          `Use ${USERNAME_MIN}-${USERNAME_MAX} characters: letters, numbers, hyphen, or underscore`
        );
        return false;
      }
    }

    if (role && !(PROFILE_ROLES as readonly string[]).includes(role)) {
      setFormError("Pick a role from the list");
      return false;
    }

    if (
      avatarDataUrl &&
      avatarDataUrl.length > AVATAR_MAX_DATA_URL_LENGTH
    ) {
      setFormError("Image too large, please pick a smaller one");
      return false;
    }

    return true;
  }

  async function handleAvatarSelected(file: File) {
    setFormError(null);
    setIsProcessingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      if (dataUrl.length > AVATAR_MAX_DATA_URL_LENGTH) {
        setFormError("Image too large, please pick a smaller one");
        return;
      }
      setAvatarDataUrl(dataUrl);
    } catch (err) {
      console.error(err);
      setFormError("Could not process that image");
    } finally {
      setIsProcessingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateBeforeSubmit()) return;

    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        role: role || "",
      };

      const trimmedUsername = username.trim().toLowerCase();
      body.username = trimmedUsername.length > 0 ? trimmedUsername : "";

      if (avatarDataUrl !== initial.avatarDataUrl) {
        body.avatarDataUrl = avatarDataUrl ?? "";
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setUsernameError("Username taken");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.message || "Could not save changes");
        return;
      }

      const data = await res.json();
      if (data.user) {
        setAuthUserProfile(data.user);
        onSaved(data.user);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setFormError("Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-profile-title" className="text-lg font-semibold text-white">
            Edit profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-zinc-700">
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarDataUrl}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-medium text-white">
                    {avatarInitials}
                  </div>
                )}
              </div>
              {isProcessingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingAvatar || isSaving}
              >
                {avatarDataUrl ? "Change photo" : "Upload photo"}
              </Button>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl(undefined)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  disabled={isProcessingAvatar || isSaving}
                >
                  Remove photo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarSelected(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              disabled={isSaving}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-username">Username</Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError(null);
              }}
              onBlur={() => setUsername((v) => v.trim().toLowerCase())}
              maxLength={USERNAME_MAX}
              placeholder="your_handle"
              disabled={isSaving}
              aria-invalid={!!usernameError}
            />
            {usernameError ? (
              <p className="text-xs text-red-400">{usernameError}</p>
            ) : (
              <p className="text-xs text-zinc-500">
                {USERNAME_MIN}-{USERNAME_MAX} characters; letters, numbers,
                hyphen, or underscore
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-role">Role or Title</Label>
            <select
              id="profile-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            >
              <option value="">— Select a role —</option>
              {PROFILE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isProcessingAvatar}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
