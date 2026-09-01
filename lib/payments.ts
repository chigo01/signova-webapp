import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";

export type PlanId = "pro";
export type SubscriptionPlan = "free" | PlanId;

export const PRO_PLAN_PRICE_USD = 39.99;
export const PRO_PLAN_PRICE_LABEL = "$39.99";

export function formatExpiryDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

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
    priceUsdLabel: PRO_PLAN_PRICE_LABEL,
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
};

export type PaymentProvider = "bachs" | "aella";
export type BachsCheckoutMethod = "bank_transfer" | "card" | "crypto";

export interface UpgradePaymentResponse {
  message: string;
  transactionId: string;
  planId: PlanId;
  monthsCount: number;
  displayUsd: number;
  provider?: PaymentProvider;
  bachsPaymentMethod?: BachsCheckoutMethod;
  authorizationUrl: string;
  reference: string;
  amount: number;
  amountNgn?: number;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  expiresAt: string;
}

export interface TransactionStatusResponse {
  id: string;
  status: "pending" | "success" | "failed";
  planId: PlanId;
  monthsCount: number;
  provider?: PaymentProvider;
  bachsPaymentMethod?: BachsCheckoutMethod;
  amount: number;
  displayUsd?: number;
  amountNgn?: number;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
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
  dextopus: PaymentRailStatus;
  bachs: PaymentRailStatus;
  aella?: PaymentRailStatus;
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

export async function createBachsUpgradePayment(
  planId: PlanId,
  paymentMethod: BachsCheckoutMethod,
  options: { signal?: AbortSignal } = {},
): Promise<UpgradePaymentResponse> {
  const response = await fetch(`${apiBase()}/payments/upgrade/bachs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ planId, paymentMethod }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as UpgradePaymentResponse;
}

export async function createAellaUpgradePayment(
  planId: PlanId,
  options: { signal?: AbortSignal } = {},
): Promise<UpgradePaymentResponse> {
  const response = await fetch(`${apiBase()}/payments/upgrade/aella`, {
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

export function upgradePaymentFromStatus(
  status: TransactionStatusResponse,
): UpgradePaymentResponse {
  return {
    message: "Payment resumed",
    transactionId: status.id,
    planId: status.planId,
    monthsCount: status.monthsCount,
    displayUsd: status.displayUsd ?? status.amount,
    provider: status.provider,
    bachsPaymentMethod: status.bachsPaymentMethod,
    authorizationUrl: status.authorizationUrl,
    reference: status.reference,
    amount: status.amount,
    amountNgn: status.amountNgn,
    accountNumber: status.accountNumber,
    accountName: status.accountName,
    bankName: status.bankName,
    expiresAt: status.expiresAt,
  };
}

export function checkoutIdFromSearch(search: string): string | null {
  const value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    .get("checkout_id")
    ?.trim();
  return value || null;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
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
