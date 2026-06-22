import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";

// App-facing helpers for the trader's default indicator (study) template.
// These are Signova features (not part of TradingView's IExternalSaveLoadAdapter),
// so they live separately from lib/trading-view-save-load-adapter.ts.

const BASE = `${API_URL}/chart-presets`;

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

export interface StudyTemplateSummary {
  name: string;
  isDefault: boolean;
}

export async function listStudyTemplatesWithDefault(): Promise<
  StudyTemplateSummary[]
> {
  try {
    const res = await fetch(`${BASE}/study-templates`, {
      headers: jsonHeaders(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { templates?: StudyTemplateSummary[] };
    return data.templates ?? [];
  } catch {
    return [];
  }
}

export async function getDefaultStudyTemplate(): Promise<{
  name: string;
  content: string;
} | null> {
  try {
    const res = await fetch(`${BASE}/study-templates/default`, {
      headers: jsonHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      default?: { name: string; content: string } | null;
    };
    return data.default ?? null;
  } catch {
    return null;
  }
}

export async function setDefaultStudyTemplate(name: string): Promise<void> {
  const res = await fetch(`${BASE}/study-templates/default`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Set default template failed: ${res.status}`);
  }
}
