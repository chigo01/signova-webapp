import { Signal } from "@/types/signal";
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
  ShieldAlert,
  Target,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { playSignal } from "@/lib/signals";

interface SignalCardProps {
  signal: Signal;
  onClick?: (pair: string) => void;
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isBuy = signal.direction === "BUY";
  const directionColor = isBuy ? "text-green-500" : "text-red-500";
  const directionBg = isBuy ? "bg-green-500/10" : "bg-red-500/10";
  const Icon = isBuy ? ArrowUp : ArrowDown;

  const handlePlay = async () => {
    try {
      setIsPlaying(true);
      await playSignal(signal);
      // Optional: Show success feedback
      alert("Signal played successfully!");
    } catch (error) {
      console.error("Failed to play signal:", error);
      alert("Failed to play signal. Please try again.");
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div 
      className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(signal.pair)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${directionBg}`}>
            <Icon className={`w-5 h-5 ${directionColor}`} />
          </div>
          <div>
            <h3 className="font-bold text-lg">{signal.pair}</h3>
            <span className={`text-xs font-bold ${directionColor}`}>
              {signal.direction}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className="font-mono font-bold text-primary">
            {signal.confidence}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="col-span-2 p-2 rounded bg-background/50 border border-border/50 flex justify-between items-center">
          <span className="text-muted-foreground">Entry</span>
          <span className="font-mono font-medium">{signal.entryPrice}</span>
        </div>

        <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-600">TP 1</span>
          </div>
          <span className="font-mono font-medium block text-right">
            {signal.exitTargets.takeProfit1}
          </span>
        </div>

        <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-600">SL</span>
          </div>
          <span className="font-mono font-medium block text-right">
            {signal.exitTargets.stopLoss}
          </span>
        </div>
      </div>

      {signal.reasoning && signal.reasoning.length > 0 && (
        <div className="mb-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {signal.reasoning[0]}
          </p>
        </div>
      )}

      <Button
        onClick={handlePlay}
        disabled={isPlaying}
        className="w-full gap-2"
        size="sm"
      >
        {isPlaying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        {isPlaying ? "Playing..." : "Play Signal"}
      </Button>
    </div>
  );
}
