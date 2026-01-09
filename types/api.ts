export interface Signal {
  _id?: string;
  pair: string;
  direction: "BUY" | "SELL" | "HOLD";
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  charts?: {
    [key: string]: string; // URL
  };
  screenshot?: {
    url: string;
    publicId: string;
    isApproved: boolean;
  };
}

export interface MarketSummary {
  [key: string]: any; // Relaxed for now as structure varies
}

export interface Top5RefinedResponse {
  success: boolean;
  date: string;
  signals: Signal[];
  stats: {
    totalGenerated: number;
    passedRiskFilter: number;
    top5Selected: number;
    filterPassRate: string;
    rejectedCount: number;
  };
  marketSummary?: string | MarketSummary;
  filteringSummary?: {
    totalRejected: number;
    commonRejectionReasons: { reason: string; count: number }[];
  };
}
