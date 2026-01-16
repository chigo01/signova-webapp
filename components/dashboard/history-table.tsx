import { SignalPlay } from "@/types/signal";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";

interface HistoryTableProps {
  data: SignalPlay[];
  isLoading: boolean;
}

export function HistoryTable({ data, isLoading }: HistoryTableProps) {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>No signal history found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Entry Price</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Stop Loss</th>
              <th className="px-4 py-3 font-medium">Played At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((play) => {
              const isBuy = play.signalType === "buy";
              const typeColor = isBuy ? "text-green-500" : "text-red-500";
              const Icon = isBuy ? ArrowUp : ArrowDown;

              return (
                <tr
                  key={play._id}
                  className="group hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {play.symbol}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={`flex items-center gap-1.5 ${typeColor} font-medium capitalize`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {play.signalType}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {play.entryPrice}
                  </td>
                  <td className="px-4 py-3 font-mono text-green-600/80">
                    {play.targetPrice || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-red-600/80">
                    {play.stopLoss || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(play.playedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
