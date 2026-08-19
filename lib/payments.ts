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

export type PaymentProvider = "paystack" | "bachs";

export interface UpgradePaymentResponse {
  message: string;
  transactionId: string;
  planId: PlanId;
  monthsCount: number;
  displayUsd: number;
  provider?: PaymentProvider;
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
  provider?: PaymentProvider;
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

export interface PaymentRailStatus {
  enabled: boolean;
  configured: boolean;
  label: string;
}

export interface PaymentMethodsResponse {
  paystack: PaymentRailStatus;
  dextopus: PaymentRailStatus;
  bachs: PaymentRailStatus;
}

export async function getPaymentMethods(
  options: { signal?: AbortSignal } = {},
): Promise<PaymentMethodsResponse> {
  const response = await fetch(`${apiBase()}/payments/methods`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as PaymentMethodsResponse;
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

export async function createBachsUpgradePayment(
  planId: PlanId,
  options: { signal?: AbortSignal } = {},
): Promise<UpgradePaymentResponse> {
  const response = await fetch(`${apiBase()}/payments/upgrade/bachs`, {
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

export type DepositStatus =
  | "pending"
  | "awaiting_funds"
  | "processing"
  | "success"
  | "failed"
  | "expired";

export type AddressKind =
  | "evm"
  | "solana"
  | "tron"
  | "bitcoin"
  | "near"
  | "litecoin"
  | "stellar"
  | "sui"
  | "ton"
  | "xrp";

export interface DepositSource {
  symbol: string;
  blockchain: string;
  chainId: number;
  decimals: number;
  addressKind: AddressKind | null;
  originAsset: string;
  supportsStaticAddress: boolean;
}

export interface DepositSourceChain {
  blockchain: string;
  chainId: number;
  addressKind: AddressKind | null;
  count: number;
  supportsStaticAddress: boolean;
}

export interface DepositSourcesResponse {
  requiredAmountOut: string;
  requiredAmountUsd: number;
  sources: DepositSource[];
  sourceChains: DepositSourceChain[];
}

export interface DepositPreviewResponse {
  originChainId: number;
  originAsset: string;
  symbol: string;
  blockchain: string;
  addressKind: AddressKind | null;
  decimals: number;
  refundHint: string;
  amountIn: string;
  amountInDisplay: string;
  amountOut?: string;
  minAmountOut?: string;
  amountOutDisplay?: string;
  coversPro: boolean;
  requiredAmountOut: string;
  requiredAmountUsd: number;
  expiresInSeconds?: number;
}

export interface CryptoDeposit {
  id: string;
  type: string;
  status: DepositStatus;
  providerStatus?: string;
  executionStatus?: string;
  originChainId: number;
  originAsset: string;
  symbol?: string;
  blockchain?: string;
  addressKind?: AddressKind | null;
  decimals?: number;
  amountIn: string;
  amountInDisplay?: string;
  quotedAmountOut?: string;
  minAmountOut?: string;
  settledAmountOut?: string;
  depositAddress: string;
  depositRequestId: string;
  originTransactionHashes?: string[];
  destinationTransactionHashes?: string[];
  subscriptionApplied?: boolean;
  subscriptionAppliedAt?: string;
  expiresAt?: string;
  requiredAmountOut?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDepositResponse {
  message: string;
  deposit: CryptoDeposit;
}

export interface DepositStatusResponse {
  message: string;
  deposit: CryptoDeposit;
  balance: PlanBalanceResponse;
}

export async function getDepositSources(
  options: { signal?: AbortSignal } = {},
): Promise<DepositSourcesResponse> {
  const response = await fetch(`${apiBase()}/payments/deposits/sources`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as DepositSourcesResponse;
}

export async function previewCryptoDeposit(
  input: { originChainId: number; originAsset: string },
  options: { signal?: AbortSignal } = {},
): Promise<DepositPreviewResponse> {
  const response = await fetch(`${apiBase()}/payments/deposits/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as DepositPreviewResponse;
}

export async function validateDepositRefundAddress(
  input: {
    originChainId: number;
    originAsset: string;
    refundTo: string;
  },
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  const response = await fetch(
    `${apiBase()}/payments/deposits/validate-address`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}

export async function createCryptoDeposit(
  input: {
    originChainId: number;
    originAsset: string;
    refundTo: string;
    amount?: string;
  },
  options: { signal?: AbortSignal } = {},
): Promise<CreateDepositResponse> {
  const response = await fetch(`${apiBase()}/payments/deposits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as CreateDepositResponse;
}

export async function getCryptoDeposit(
  depositId: string,
  options: { signal?: AbortSignal } = {},
): Promise<DepositStatusResponse> {
  const response = await fetch(
    `${apiBase()}/payments/deposits/${encodeURIComponent(depositId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as DepositStatusResponse;
}

export async function submitCryptoDepositHash(
  depositId: string,
  txHash: string,
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  const response = await fetch(
    `${apiBase()}/payments/deposits/${encodeURIComponent(depositId)}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ txHash }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function chainLabel(blockchain: string): string {
  if (!blockchain) return "Unknown network";
  if (blockchain.startsWith("chain-")) return blockchain;
  return blockchain
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
