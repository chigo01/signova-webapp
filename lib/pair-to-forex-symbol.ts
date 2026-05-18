export function pairToForexSymbol(pair: string): string | null {
  const compact = pair.replace(/[/\s\-:]/g, "").toUpperCase();
  const stripped = compact.replace(/^(OANDA|FX_IDC|FX|BINANCE|NASDAQ|NYSE)/, "");
  if (/^[A-Z]{6}$/.test(stripped) && !stripped.endsWith("USDT")) return stripped;
  return null;
}
