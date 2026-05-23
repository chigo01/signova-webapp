import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";
import type {
  ImportSignalPlaysResponse,
  Journal,
  JournalApiResponse,
  JournalListResponse,
  JournalProperty,
  JournalRow,
  JournalSummary,
  JournalView,
} from "@/components/journal/journal-types";

interface JournalUpdatePayload {
  title?: string;
  properties?: JournalProperty[];
  views?: JournalView[];
  rows?: JournalRow[];
}

async function parseJournalResponse(res: Response): Promise<Journal> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Journal request failed: ${res.status}`);
  }

  const data = (await res.json()) as JournalApiResponse;
  if (!data.success || !data.journal) {
    throw new Error("Invalid journal response");
  }

  return data.journal;
}

export async function fetchDefaultJournal(): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal/default`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return parseJournalResponse(res);
}

export async function fetchJournal(journalId: string): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal/${journalId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return parseJournalResponse(res);
}

export async function listJournals(): Promise<JournalSummary[]> {
  const res = await fetch(`${API_URL}/journal`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Journal list failed: ${res.status}`);
  }

  const data = (await res.json()) as JournalListResponse;
  if (!data.success || !Array.isArray(data.journals)) {
    throw new Error("Invalid journal list response");
  }

  return data.journals;
}

export async function createJournal(): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return parseJournalResponse(res);
}

export async function saveJournal(
  journalId: string,
  payload: JournalUpdatePayload,
): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal/${journalId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJournalResponse(res);
}

export async function createJournalRow(
  journalId: string,
  cells: Record<string, unknown> = {},
): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal/${journalId}/rows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ cells }),
  });

  return parseJournalResponse(res);
}

export async function updateJournalRow(
  journalId: string,
  rowId: string,
  cells: Record<string, unknown>,
): Promise<Journal> {
  const res = await fetch(`${API_URL}/journal/${journalId}/rows/${rowId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ cells }),
  });

  return parseJournalResponse(res);
}

export async function importSignalPlays(
  journalId: string,
): Promise<ImportSignalPlaysResponse> {
  const res = await fetch(`${API_URL}/journal/${journalId}/import-signal-plays`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Signal import failed: ${res.status}`);
  }

  const data = (await res.json()) as ImportSignalPlaysResponse;
  if (!data.success || !data.journal) {
    throw new Error("Invalid journal import response");
  }

  return data;
}

export async function deleteJournal(journalId: string): Promise<void> {
  const res = await fetch(`${API_URL}/journal/${journalId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    let errorMsg = `Journal delete failed: ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson?.message) errorMsg = errorJson.message;
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(errorMsg);
  }
}

export interface AskJournalResponse {
  success: boolean;
  answer: string;
  model: string;
  usage: { tokensIn: number; tokensOut: number };
}

export async function askJournal(
  journalId: string,
  question: string,
): Promise<AskJournalResponse> {
  const res = await fetch(`${API_URL}/journal/${journalId}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    let errorMsg = `AI question failed: ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson?.message) errorMsg = errorJson.message;
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(errorMsg);
  }

  const data = (await res.json()) as AskJournalResponse;
  if (!data.success || typeof data.answer !== "string") {
    throw new Error("Invalid AI question response");
  }
  return data;
}

export interface GenerateAiCellResponse {
  success: boolean;
  journal: Journal;
  value: string;
  model: string;
  usage: { tokensIn: number; tokensOut: number };
}

export async function generateAiCell(
  journalId: string,
  rowId: string,
  propertyId: string,
): Promise<GenerateAiCellResponse> {
  const res = await fetch(
    `${API_URL}/journal/${journalId}/rows/${rowId}/ai`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ propertyId }),
    },
  );

  if (!res.ok) {
    let errorMsg = `AI generation failed: ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson?.message) errorMsg = errorJson.message;
    } catch {
      // body wasn't JSON
    }
    throw new Error(errorMsg);
  }

  const data = (await res.json()) as GenerateAiCellResponse;
  if (!data.success || !data.journal) {
    throw new Error("Invalid AI generation response");
  }
  return data;
}
