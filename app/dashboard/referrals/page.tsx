"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Users,
  Coins,
  Trophy,
  Receipt,
  TriangleAlert,
  Mail,
  Phone,
  Calendar,
  Instagram,
  Linkedin,
  BookText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReferralOverview,
  getReferralTransactions,
  getReferralLeaderboard,
  formatUsdMicro,
  formatRank,
  type ReferralOverview,
  type ReferralTransactionRow,
  type LeaderboardEntry,
} from "@/lib/referrals";
import { MetricCard } from "@/components/dashboard/referrals/metric-card";
import { ReferralCodeCard } from "@/components/dashboard/referrals/referral-code-card";
import { ReferralTransactionsTable } from "@/components/dashboard/referrals/referral-transactions-table";
import { Leaderboard } from "@/components/dashboard/referrals/leaderboard";
import {
  FaqAccordion,
  type FaqItem,
} from "@/components/dashboard/referrals/faq-accordion";

type Tab = "metrics" | "wallet" | "support";

const GUIDE_STEPS = [
  {
    title: "Step 1: Get Approved",
    body: "You're part of a selective network of SIGNOVA affiliates.",
  },
  {
    title: "Step 2: Share Your Code",
    body: "Invite your audience using your unique referral code.",
  },
  {
    title: "Step 3: Audience Subscribes",
    body: "Users join SIGNOVA through your link.",
  },
  {
    title: "Step 4: Earn Recurring Revenue",
    body: "You earn every time they renew their subscription.",
  },
  {
    title: "Step 5: Get Paid",
    body: "Earnings go to your wallet and convert to cash every 6–8 weeks.",
  },
];

const FAQS: FaqItem[] = [
  {
    question: "Who can join the SIGNOVA Affiliate Program?",
    answer:
      "Any SIGNOVA user can join — every account automatically gets a unique referral code to start sharing.",
  },
  {
    question: "How do I earn money?",
    answer:
      "You earn a commission every time someone who signed up with your code pays for a subscription, on every billing cycle.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Earnings collect in your wallet and are converted to cash at the end of each payout cycle (every 6–8 weeks).",
  },
  {
    question: "What are SIGcoins?",
    answer:
      "SIGcoins are gamified rewards you earn from referral activity. They accumulate in your account alongside your cash earnings.",
  },
  {
    question: "Can I track my performance?",
    answer:
      "Yes — the Metrics tab shows your total earnings, referrals, SIGcoins, and leaderboard rank in real time.",
  },
  {
    question: "Is there a limit to how much I can earn?",
    answer:
      "No. The more of your audience that subscribes and renews, the more you earn — there is no cap.",
  },
  {
    question: "What makes SIGNOVA different?",
    answer:
      "SIGNOVA pays recurring revenue on every renewal, not just a one-time signup bounty.",
  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "metrics", label: "Metrics" },
  { id: "wallet", label: "Wallet" },
  { id: "support", label: "Support" },
];

const PAYOUT_NOTE =
  "All referral earnings are collected here and automatically converted to cash at the end of each payout cycle.";

function WalletBalances({
  balanceUsdMicro,
  pendingUsdMicro,
}: {
  balanceUsdMicro: number;
  pendingUsdMicro: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-black/40 p-5">
        <p className="text-sm font-medium text-zinc-400">Balance</p>
        <p className="mt-1 text-3xl font-bold text-emerald-400">
          {formatUsdMicro(balanceUsdMicro)}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Your current earnings ready for payout.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-black/40 p-5">
        <p className="text-sm font-medium text-zinc-400">Pending Balance</p>
        <p className="mt-1 text-3xl font-bold text-amber-400">
          {formatUsdMicro(pendingUsdMicro)}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Earnings being processed (converted{" "}
          <span className="font-semibold text-zinc-300">every 6–8 weeks</span>).
        </p>
      </div>
    </div>
  );
}

function PayoutNote() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-500/90">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold">NB:</span> {PAYOUT_NOTE}
      </span>
    </div>
  );
}

export default function ReferralsPage() {
  const [tab, setTab] = useState<Tab>("metrics");
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransactionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [ov, txs, lb] = await Promise.all([
          getReferralOverview({ signal: controller.signal }),
          getReferralTransactions({ signal: controller.signal }),
          getReferralLeaderboard({ signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setOverview(ov);
        setTransactions(txs);
        setLeaderboard(lb.entries);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">
          {tab === "support" ? "Need Help?" : "Affiliate Account"}
        </h1>
        <div className="inline-flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-16 text-center text-sm text-zinc-500">Loading…</div>
      ) : error ? (
        <div className="mt-16 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      ) : !overview ? null : (
        <div className="mt-6">
          {tab === "metrics" && (
            <MetricsTab
              overview={overview}
              leaderboard={leaderboard}
              onViewTransactions={() => setTab("wallet")}
            />
          )}
          {tab === "wallet" && (
            <WalletTab overview={overview} transactions={transactions} />
          )}
          {tab === "support" && <SupportTab />}
        </div>
      )}
    </div>
  );
}

function MetricsTab({
  overview,
  leaderboard,
  onViewTransactions,
}: {
  overview: ReferralOverview;
  leaderboard: LeaderboardEntry[];
  onViewTransactions: () => void;
}) {
  const { stats, wallet } = overview;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Earnings"
          value={formatUsdMicro(stats.totalEarningsUsdMicro)}
          description="Your lifetime earnings from all referrals."
          Icon={DollarSign}
        />
        <MetricCard
          label="Total Referrals"
          value={stats.totalReferrals.toLocaleString("en-US")}
          description="All-time successful sign-ups."
          Icon={Users}
        />
        <MetricCard
          label="SIGcoins Earned"
          value={stats.sigcoins.toLocaleString("en-US")}
          description="Your total gamified rewards from referrals."
          Icon={Coins}
        />
        <MetricCard
          label="Leaderboard Rank"
          value={formatRank(stats.leaderboardRank)}
          description="Your current position among all affiliates."
          Icon={Trophy}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">SIGNOVA Wallet</h2>
            <button
              type="button"
              onClick={onViewTransactions}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              <Receipt className="h-4 w-4" aria-hidden />
              View Transactions
            </button>
          </div>
          <div className="mt-5">
            <WalletBalances
              balanceUsdMicro={wallet.balanceUsdMicro}
              pendingUsdMicro={wallet.pendingUsdMicro}
            />
            <PayoutNote />
          </div>
        </div>

        <Leaderboard entries={leaderboard} />
      </div>

      <ReferralCodeCard code={overview.code} shareUrl={overview.shareUrl} />
    </div>
  );
}

function WalletTab({
  overview,
  transactions,
}: {
  overview: ReferralOverview;
  transactions: ReferralTransactionRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">SIGNOVA Wallet</h2>
        <div className="mt-5">
          <WalletBalances
            balanceUsdMicro={overview.wallet.balanceUsdMicro}
            pendingUsdMicro={overview.wallet.pendingUsdMicro}
          />
          <PayoutNote />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-white">All Transactions</h2>
        <ReferralTransactionsTable transactions={transactions} />
      </div>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Contact Support</h2>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <a
            href="mailto:support@signova.app"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-medium text-black transition-colors hover:bg-white/90"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Send a mail
          </a>
          <a
            href="mailto:support@signova.app?subject=Book%20a%20Call"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-medium text-white transition-colors hover:border-zinc-700"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            Book a Call
          </a>
          <span className="inline-flex items-center gap-2 text-zinc-400">
            <Phone className="h-4 w-4" aria-hidden />
            +234 81 232 343 235
          </span>
          <div className="ml-auto flex items-center gap-3 text-zinc-400">
            <Instagram className="h-5 w-5" aria-hidden />
            <Linkedin className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="flex items-center gap-2">
            <BookText className="h-5 w-5 text-zinc-400" aria-hidden />
            <h2 className="text-lg font-semibold text-white">
              Affiliate Guide: How You Earn
            </h2>
          </div>
          <div className="mt-5 space-y-3">
            {GUIDE_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-zinc-800 bg-black/40 p-4"
              >
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="mb-5 text-lg font-semibold text-white">FAQs</h2>
          <FaqAccordion items={FAQS} />
        </div>
      </div>
    </div>
  );
}
