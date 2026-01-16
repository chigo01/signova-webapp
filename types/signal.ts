export interface ITechnicalIndicators {
  rsi: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
}

export interface ISupportResistance {
  resistance: number[];
  support: number[];
  currentLevel: "support" | "resistance" | "neutral";
}

export interface IRiskMetrics {
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  positionSize: number;
  maxDrawdown: number;
}

export interface IExitTargets {
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
}

export interface Signal {
  _id: string; // Mongoose adds this
  pair: string;
  direction: "BUY" | "SELL" | "HOLD";
  timeframe: string;
  confidence: number;
  strength: number;
  entryPrice: number;
  exitTargets: IExitTargets;
  technicalIndicators: ITechnicalIndicators;
  supportResistance: ISupportResistance;
  riskAssessment: IRiskMetrics;
  reasoning: string[];
  timestamp: string; // Date comes as string from JSON
  screenshot?: {
    url: string;
    publicId: string;
    isApproved: boolean;
    submittedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
  };
}

export interface SignalPlay {
  _id: string;
  userId: string;
  signalId: string;
  symbol: string;
  signalType: "buy" | "sell";
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  playedAt: string;
  createdAt: string;
  updatedAt: string;
}
