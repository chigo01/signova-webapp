export type StockNode = {
  name: string;
  size: number;
  change: number;
};

export type SectorNode = {
  name: string;
  children: StockNode[];
};

export const sectors: SectorNode[] = [
  {
    name: "Information technology",
    children: [
      { name: "AAPL", size: 400, change: 2.5 },
      { name: "MSFT", size: 380, change: 1.8 },
      { name: "NVDA", size: 250, change: 3.2 },
      { name: "ADBE", size: 180, change: 1.5 },
      { name: "INTC", size: 140, change: 0.8 },
      { name: "CSCO", size: 120, change: 1.2 },
      { name: "CRM", size: 110, change: 2.1 },
      { name: "IBM", size: 90, change: 0.5 },
    ],
  },
  {
    name: "Financials",
    children: [
      { name: "JNJ", size: 200, change: -1.5 },
      { name: "ABBV", size: 150, change: 1.2 },
      { name: "LLY", size: 180, change: -0.8 },
      { name: "UNH", size: 160, change: 1.5 },
      { name: "BMY", size: 120, change: -0.5 },
      { name: "AMGN", size: 110, change: 0.8 },
      { name: "GILD", size: 90, change: 1.2 },
      { name: "AIG", size: 110, change: -1.2 },
      { name: "TMO", size: 140, change: 1.8 },
      { name: "MDT", size: 90, change: 0.6 },
      { name: "CI", size: 80, change: -0.9 },
      { name: "DHR", size: 100, change: 1.4 },
      { name: "ISRG", size: 70, change: 2.1 },
      { name: "CVS", size: 80, change: -0.3 },
    ],
  },
  {
    name: "Consumer staples",
    children: [
      { name: "AMZN", size: 300, change: 2.8 },
      { name: "TSLA", size: 260, change: -2.1 },
      { name: "HD", size: 150, change: 1.2 },
      { name: "NKE", size: 120, change: 0.8 },
      { name: "LOW", size: 110, change: -0.5 },
      { name: "SBUX", size: 100, change: 1.5 },
      { name: "TJX", size: 90, change: 0.9 },
      { name: "GM", size: 80, change: -1.2 },
      { name: "F", size: 70, change: -0.8 },
      { name: "MAR", size: 65, change: 1.1 },
      { name: "YUM", size: 60, change: 0.6 },
      { name: "HLT", size: 55, change: 1.3 },
    ],
  },
];
