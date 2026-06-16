import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";

export interface ReferralOverview {
  code: string;
  shareUrl: string;
  stats: {
    totalEarningsUsdMicro: number;
    totalReferrals: number;
    sigcoins: number;
    leaderboardRank: number | null;
  };
  wallet: {
    balanceUsdMicro: number;
    pendingUsdMicro: number;
  };
}

export interface ReferralTransactionRow {
  id: string;
  sourceTransactionId: string;
  referredName: string;
  planId: string;
  amountUsdMicro: number;
  sigcoinsAwarded: number;
  status: "pending" | "available" | "paid";
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  totalEarningsUsdMicro: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: number | null;
}

function apiBase(): string {
  return API_URL.replace(/\/$/, "");
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (data && typeof data.message === "string") return data.message;
  } catch {
    // fall through
  }
  return `Request failed with status ${response.status}`;
}

export async function getReferralOverview(
  options: { signal?: AbortSignal } = {},
): Promise<ReferralOverview> {
  const response = await fetch(`${apiBase()}/referrals/overview`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as ReferralOverview;
}

export async function getReferralTransactions(
  options: { signal?: AbortSignal } = {},
): Promise<ReferralTransactionRow[]> {
  const response = await fetch(`${apiBase()}/referrals/transactions`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const data = (await response.json()) as {
    transactions: ReferralTransactionRow[];
  };
  return data.transactions;
}

export async function getReferralLeaderboard(
  options: { signal?: AbortSignal } = {},
): Promise<LeaderboardResponse> {
  const response = await fetch(`${apiBase()}/referrals/leaderboard`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as LeaderboardResponse;
}

/** Format USD micro-units (1 USD = 1_000_000) as a $#,##0.00 string. */
export function formatUsdMicro(amountUsdMicro: number): string {
  const usd = amountUsdMicro / 1_000_000;
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Render a 1-based rank as 1st, 2nd, 3rd, ... */
export function formatRank(rank: number | null): string {
  if (rank === null) return "—";
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}
