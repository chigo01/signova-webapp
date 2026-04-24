export interface TradingViewSubscription<T extends (...args: any[]) => void> {
  subscribe(obj: object | null, member: T, singleshot?: boolean): void;
  unsubscribe(obj: object | null, member: T): void;
}

export interface TradingViewSymbolInfo {
  name?: string;
  ticker?: string;
}

export interface TradingViewChartApi {
  createShape(
    point: { time: number; price?: number },
    options: Record<string, unknown>
  ): Promise<string>;
  removeEntity(entityId: string): void;
  onSymbolChanged(): TradingViewSubscription<
    (symbol: TradingViewSymbolInfo) => void
  >;
  onIntervalChanged(): TradingViewSubscription<
    (interval: string, timeframe: unknown) => void
  >;
}

export interface TradingViewWidgetHandle {
  onChartReady(callback: () => void): void;
  activeChart(): TradingViewChartApi;
  setSymbol(symbol: string, interval: string, callback: () => void): void;
  remove(): void;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => TradingViewWidgetHandle;
    };
    Datafeeds?: {
      UDFCompatibleDatafeed: new (
        datafeedUrl: string,
        updateFrequency?: number,
        limitedServerResponse?: {
          maxResponseLength: number;
          expectedOrder: "latestFirst" | "earliestFirst";
        }
      ) => unknown;
    };
    __tvAdvancedChartLoader__?: Promise<void>;
  }
}

export {};
