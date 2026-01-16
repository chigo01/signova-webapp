import { Signal } from "@/types/signal";
import { SignalCard } from "./signal-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface SignalsPanelProps {
  signals: Signal[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function SignalsPanel({
  signals,
  isLoading,
  onRefresh,
}: SignalsPanelProps) {
  if (isLoading && signals.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading signals...</p>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-card/30">
        <div className="bg-background p-4 rounded-full shadow-sm">
          <RefreshCw className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="max-w-[240px]">
          <h3 className="font-semibold text-foreground mb-1">
            No signals available
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try again later to check for new trading opportunities.
          </p>
          <Button
            onClick={onRefresh}
            variant="outline"
            className="gap-2 w-full"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/30">
        <h2 className="font-semibold text-lg">Active Signals</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {signals.map((signal) => (
          <SignalCard key={signal._id} signal={signal} />
        ))}
      </div>
    </div>
  );
}
