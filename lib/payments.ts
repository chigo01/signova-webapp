import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";

export type PlanId = "pro" | "business";
export type SubscriptionPlan = "free" | PlanId;

export interface PlanMeta {
  id: PlanId | "free";
  badge: string;
  priceUsdLabel: string;
  durationLabel: string;
  periodLabel: string;
  features: string[];
  highlight?: string;
}

export const PLAN_META: Record<PlanId | "free", PlanMeta> = {
  free: {
    id: "free",
    badge: "FREE PLAN",
    priceUsdLabel: "$0.00",
    durationLabel: "Forever",
    periodLabel: "Unlimited",
    features: [
      "Introduction",
      "Strike Selection Guidance",
      "Risk vs Reward Framing",
      "Market Context Notes",
      "Market Sentiment Context",
    ],
  },
  pro: {
    id: "pro",
    badge: "PRO PLAN",
    priceUsdLabel: "\u20a6100",
    durationLabel: "For 1 month",
    periodLabel: "Monthly",
    features: [
      "Options Flow Awareness",
      "Strike Selection Guidance",
      "Risk vs Reward Framing",
      "Market Context Notes",
      "Market Sentiment Context",
    ],
  },
  business: {
    id: "business",
    badge: "BUSINESS PLAN",
    priceUsdLabel: "\u20a6200",
    durationLabel: "For 2 months.",
    periodLabel: "Test pricing",
    features: [
      "Market Direction Signals",
      "Entry + Exit Zones",
      "Risk Level Indicators",
      "Market Context Notes",
      "Trade Setup Explanations",
    ],
  },
};

export interface UpgradePaymentResponse {
  message: string;
  transactionId: string;
  planId: PlanId;
  monthsCount: number;
  displayUsd: number;
  authorizationUrl: string;
  reference: string;
  amount: number;
  expiresAt: string;
}

export interface TransactionStatusResponse {
  id: string;
  status: "pending" | "success" | "failed";
  planId: PlanId;
  monthsCount: number;
  amount: number;
  displayUsd?: number;
  authorizationUrl: string;
  reference: string;
  expiresAt: string;
  createdAt: string;
  user: {
    plan: SubscriptionPlan;
    proPlanExpiry?: string | null;
  };
}

export interface PlanBalanceResponse {
  plan: SubscriptionPlan;
  proPlanExpiry?: string | null;
  balanceUsdMicro: number;
  balanceUsd: string;
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

export async function createUpgradePayment(
  planId: PlanId,
  options: { signal?: AbortSignal } = {},
): Promise<UpgradePaymentResponse> {
  const response = await fetch(`${apiBase()}/payments/upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ planId }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as UpgradePaymentResponse;
}

export async function getTransactionStatus(
  transactionId: string,
  options: { signal?: AbortSignal } = {},
): Promise<TransactionStatusResponse> {
  const response = await fetch(
    `${apiBase()}/payments/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as TransactionStatusResponse;
}

export async function getPlanBalance(
  options: { signal?: AbortSignal } = {},
): Promise<PlanBalanceResponse> {
  const response = await fetch(`${apiBase()}/payments/balance`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as PlanBalanceResponse;
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
