import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LotSizeCalculatorModal } from "./lot-size-calculator-modal";
import { resetQuoteRateCache } from "@/lib/quote-rate";
import { Signal } from "@/types/signal";

/**
 * Stand in for the /candles endpoint the cross-rate lookup reads. `closes` maps
 * a 6-letter symbol to its latest close; anything absent answers noData, which
 * is how the real endpoint reports a pair it can't price.
 */
function stubCandles(closes: Record<string, number>) {
  const fetchMock = vi.fn(async (url: string) => {
    const symbol = new URL(url, "http://localhost").searchParams.get("pair")!;
    const close = closes[symbol];
    return {
      ok: true,
      json: async () =>
        close === undefined
          ? { bars: [], noData: true }
          : { bars: [{ close }], noData: false },
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Node 22 exposes its own experimental `localStorage` global, which shadows
// jsdom's and is inert without --localstorage-file. Stub a working in-memory
// Storage so the modal's persistence path runs for real.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  });
  // Rates are cached per currency at module scope; clear so each test's stub
  // is actually consulted.
  resetQuoteRateCache();
  stubCandles({});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    _id: "signal-1",
    pair: "EUR/USD",
    direction: "BUY",
    entryPrice: 1.0842,
    exitTargets: { stopLoss: 1.0812, takeProfit1: 1.0902, takeProfit2: 1.0962 },
    ...overrides,
  } as Signal;
}

function field(label: string | RegExp): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

describe("LotSizeCalculatorModal", () => {
  it("prefills from the signal and sizes the position", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    expect(field("Entry price").value).toBe("1.0842");
    expect(field("Stop loss").value).toBe("1.0812");
    // Defaults: $10,000 at 1% risk over a 30 pip stop -> 0.33 lots.
    expect(field("Account balance").value).toBe("10000");
    expect(field("Risk").value).toBe("1");

    expect(screen.getByText("0.33")).toBeInTheDocument();
    expect(screen.getByText(/33,000 units/)).toBeInTheDocument();
    expect(screen.getByText("30.0 pips")).toBeInTheDocument();
    expect(screen.getByText("$3.30")).toBeInTheDocument();
    expect(screen.getByText("$99.00 of $100.00")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows both reward targets with their R multiples", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    // TP1 is 60 pips out against a 30 pip stop, TP2 is 120 pips.
    expect(screen.getByText("TP1 at 1.0902")).toBeInTheDocument();
    expect(screen.getByText("$198.00 · 2.00R")).toBeInTheDocument();
    expect(screen.getByText("TP2 at 1.0962")).toBeInTheDocument();
    expect(screen.getByText("$396.00 · 4.00R")).toBeInTheDocument();
  });

  it("recomputes when risk changes and persists the new value", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(field("Risk"), { target: { value: "2" } });

    expect(screen.getByText("0.66")).toBeInTheDocument();
    expect(window.localStorage.getItem("signova_lot_size_settings")).toBe(
      JSON.stringify({ accountBalance: 10000, riskPercent: 2 }),
    );
  });

  it("reuses a balance stored by another card's calculator", () => {
    window.localStorage.setItem(
      "signova_lot_size_settings",
      JSON.stringify({ accountBalance: 50000, riskPercent: 0.5 }),
    );

    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    expect(field("Account balance").value).toBe("50000");
    expect(field("Risk").value).toBe("0.5");
    // $250 of risk over a $300-per-lot stop.
    expect(screen.getByText("0.83")).toBeInTheDocument();
  });

  it("fetches the conversion rate itself once a cross pair is selected", async () => {
    stubCandles({ JPYUSD: 0.0063694 });
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    expect(screen.queryByLabelText(/USD per 1/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURJPY" },
    });

    expect(screen.getByLabelText("USD per 1 JPY")).toBeInTheDocument();

    await waitFor(() =>
      expect(field("USD per 1 JPY").value).toBe("0.0063694"),
    );
    expect(screen.getByText(/Live rate/)).toBeInTheDocument();
    // The rate arrived, so nothing is left unconverted.
    expect(screen.queryByText(/cross pair/)).not.toBeInTheDocument();
  });

  it("falls back to the inverse leg when the direct one has no data", async () => {
    stubCandles({ USDJPY: 157 });
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURJPY" },
    });

    // 1 / 157 = 0.00636943, to six significant figures.
    await waitFor(() =>
      expect(field("USD per 1 JPY").value).toBe("0.00636943"),
    );
  });

  it("re-resolves the rate when the instrument changes currency", async () => {
    stubCandles({ JPYUSD: 0.0063694, AUDUSD: 0.70599 });
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURJPY" },
    });
    await waitFor(() =>
      expect(field("USD per 1 JPY").value).toBe("0.0063694"),
    );

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURAUD" },
    });

    // The JPY rate must not carry over onto an AUD-quoted pair.
    await waitFor(() => expect(field("USD per 1 AUD").value).toBe("0.70599"));
  });

  it("lets the user override the fetched rate", async () => {
    stubCandles({ JPYUSD: 0.0063694 });
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURJPY" },
    });
    await waitFor(() =>
      expect(field("USD per 1 JPY").value).toBe("0.0063694"),
    );

    fireEvent.change(field("USD per 1 JPY"), { target: { value: "0.0064" } });

    expect(screen.getByText(/Using your rate/)).toBeInTheDocument();
    expect(screen.queryByText(/Live rate/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cross pair/)).not.toBeInTheDocument();

    // The override is reversible, including after clearing the field entirely.
    fireEvent.change(field("USD per 1 JPY"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Use live rate"));

    expect(field("USD per 1 JPY").value).toBe("0.0063694");
    expect(screen.getByText(/Live rate/)).toBeInTheDocument();
  });

  it("asks for the rate manually when the lookup fails", async () => {
    // Neither leg priced — the endpoint answers noData for both.
    stubCandles({});
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("Instrument"), {
      target: { value: "EURJPY" },
    });

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't load the JPY rate. Enter it manually."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/cross pair/)).toBeInTheDocument();

    fireEvent.change(field("USD per 1 JPY"), { target: { value: "0.0064" } });

    expect(screen.queryByText(/cross pair/)).not.toBeInTheDocument();
  });

  it("derives the rate itself for a USD-based pair, with no rate field", () => {
    render(
      <LotSizeCalculatorModal
        signal={makeSignal({
          pair: "USD/JPY",
          entryPrice: 157,
          exitTargets: { stopLoss: 156.5 } as Signal["exitTargets"],
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByLabelText(/USD per 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cross pair/)).not.toBeInTheDocument();
    expect(screen.getByText("50.0 pips")).toBeInTheDocument();
    expect(screen.getByText("0.31")).toBeInTheDocument();
  });

  it("replaces the result with an explanation when an input is unusable", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(field("Account balance"), { target: { value: "" } });

    expect(
      screen.getByText("Enter an account balance greater than 0."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Lot size")).not.toBeInTheDocument();
    // An unusable balance must not overwrite the stored one.
    expect(window.localStorage.getItem("signova_lot_size_settings")).toBe(
      JSON.stringify({ accountBalance: 10000, riskPercent: 1 }),
    );
  });

  it("warns when the account is too small to place the trade", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(field("Account balance"), { target: { value: "200" } });

    expect(screen.getByText(/below the 0.01 minimum/)).toBeInTheDocument();
  });

  it("closes on Escape and on the close button", () => {
    const onClose = vi.fn();
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
