import { Copy } from "lucide-react";
import {
  formatUsdMicro,
  type ReferralTransactionRow,
} from "@/lib/referrals";

interface ReferralTransactionsTableProps {
  transactions: ReferralTransactionRow[];
}

function planLabel(planId: string): string {
  return planId.charAt(0).toUpperCase() + planId.slice(1);
}

export function ReferralTransactionsTable({
  transactions,
}: ReferralTransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-10 text-center text-sm text-zinc-500">
        No transactions yet. Earnings appear here as your referrals subscribe.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="px-5 py-4 font-medium">Transaction ID</th>
              <th className="px-5 py-4 font-medium">Referral</th>
              <th className="px-5 py-4 font-medium">Plan category</th>
              <th className="px-5 py-4 text-right font-medium">
                SIGcoins Earned ($)
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2 font-mono text-zinc-400">
                    <Copy className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                    <span className="max-w-[180px] truncate">
                      {tx.sourceTransactionId}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-white">
                  {tx.referredName}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {planLabel(tx.planId)}
                </td>
                <td className="px-5 py-4 text-right text-zinc-300">
                  {formatUsdMicro(tx.amountUsdMicro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
