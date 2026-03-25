"use client";

import React, { memo, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

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
  const isMounted = useRef(true);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    isMounted.current = true;

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

    // Show loading overlay until iframe loads (or fallback timeout)
    const showOverlay = () => {
      if (!overlayRef.current) return;
      overlayRef.current.dataset.state = "loading";
    };
    const hideOverlay = () => {
      if (!overlayRef.current) return;
      overlayRef.current.dataset.state = "ready";
    };

    showOverlay();

    let iframe: HTMLIFrameElement | null = null;
    let pollId: number | null = null;
    let timeoutId: number | null = null;

    const attachIframeLoad = () => {
      if (!container.current) return false;
      iframe = container.current.querySelector("iframe");
      if (!iframe) return false;

      // If already loaded (rare), hide immediately.
      if ((iframe as any).complete) hideOverlay();

      const onLoad = () => {
        if (!isMounted.current) return;
        hideOverlay();
      };
      iframe.addEventListener("load", onLoad, { once: true });
      return true;
    };

    // Poll briefly for iframe creation (widget injects it async).
    pollId = window.setInterval(() => {
      if (attachIframeLoad()) {
        if (pollId) window.clearInterval(pollId);
        pollId = null;
      }
    }, 120);

    // Fallback: don’t leave users staring at an infinite loader
    timeoutId = window.setTimeout(() => {
      if (!isMounted.current) return;
      hideOverlay();
      if (pollId) window.clearInterval(pollId);
      pollId = null;
    }, 8000);

    return () => {
      isMounted.current = false;
      if (pollId) window.clearInterval(pollId);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (container.current) container.current.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ height: "100%", width: "100%" }}>
      <div
        className="tradingview-widget-container h-full w-full"
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

      <div
        ref={overlayRef}
        data-state="loading"
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 data-[state=ready]:opacity-0 data-[state=ready]:invisible"
        aria-hidden
      >
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading chart…
        </div>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);

