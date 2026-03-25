"use client";

import React, { memo, useEffect, useRef } from "react";

type TradingViewWidgetProps = {
  /** TradingView symbol like "NASDAQ:AAPL" */
  symbol?: string;
  /** TradingView interval like "1", "5", "60", "D", "W" */
  interval?: string;
  className?: string;
};

function TradingViewWidget({
  symbol = "OANDA:EURUSD",
  interval = "D",
  className,
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear any previous widget/script (important when symbol/interval changes)
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
          "allow_symbol_change": true,
          "calendar": false,
          "details": false,
          "hide_side_toolbar": true,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "hide_volume": false,
          "hotlist": false,
          "interval": ${JSON.stringify(interval)},
          "locale": "en",
          "save_image": true,
          "style": "1",
          "symbol": ${JSON.stringify(symbol)},
          "theme": "dark",
          "timezone": "Etc/UTC",
          "backgroundColor": "#0F0F0F",
          "gridColor": "rgba(242, 242, 242, 0.06)",
          "watchlist": [],
          "withdateranges": false,
          "compareSymbols": [],
          "studies": [],
          "autosize": true
        }`;

    container.current.appendChild(script);

    return () => {
      if (container.current) container.current.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      className={`tradingview-widget-container ${className ?? ""}`}
      ref={container}
      style={{ height: "100%", width: "100%" }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      />
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">Chart</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);

