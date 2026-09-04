import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LotSizeCalculatorModal } from "./lot-size-calculator-modal";
import { fetchUsdPerUnit, resetQuoteRateCache } from "@/lib/quote-rate";
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

function storedSettings() {
  const raw = window.localStorage.getItem("signova_lot_size_settings");
  return raw === null ? null : JSON.parse(raw);
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
    expect(storedSettings()).toEqual({
      accountBalance: 10000,
      riskPercent: 2,
      accountCurrency: "USD",
      costBufferPercent: 0,
      lotStep: 0.01,
    });
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
    // No rate means no number at all — sizing on the fallback of 1 is refused.
    expect(screen.getByText(/couldn't be loaded/)).toBeInTheDocument();
    expect(screen.queryByText("Lot size")).not.toBeInTheDocument();

    fireEvent.change(field("USD per 1 JPY"), { target: { value: "0.0064" } });

    expect(screen.queryByText(/couldn't be loaded/)).not.toBeInTheDocument();
    expect(screen.getByText("Lot size")).toBeInTheDocument();
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
    expect(storedSettings()).toEqual({
      accountBalance: 10000,
      riskPercent: 1,
      accountCurrency: "USD",
      costBufferPercent: 0,
      lotStep: 0.01,
    });
  });

  it("warns when the account is too small to place the trade", () => {
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

    fireEvent.change(field("Account balance"), { target: { value: "200" } });

    expect(
      screen.getByText(/below the broker minimum of 0.01/),
    ).toBeInTheDocument();
  });

  it("closes on Escape and on the close button", () => {
    const onClose = vi.fn();
    render(<LotSizeCalculatorModal signal={makeSignal()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe("account currency", () => {
    const currency = () =>
      screen.getByLabelText("Account currency") as HTMLSelectElement;

    function selectCurrency(code: string) {
      fireEvent.change(currency(), { target: { value: code } });
    }

    function storeCurrency(code: string) {
      window.localStorage.setItem(
        "signova_lot_size_settings",
        JSON.stringify({
          accountBalance: 10000,
          riskPercent: 1,
          accountCurrency: code,
        }),
      );
    }

    it("defaults to USD and seeds from storage", () => {
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);
      expect(currency().value).toBe("USD");

      cleanup();
      storeCurrency("JPY");
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);
      expect(currency().value).toBe("JPY");
    });

    it("converts the balance and relabels every figure", async () => {
      stubCandles({ AUDUSD: 0.70559 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AUD");

      // 10,000 USD / 0.70559 = 14,172.54 AUD.
      await waitFor(() =>
        expect(field("Account balance").value).toBe("14172.54"),
      );
      expect(screen.getByText("A$")).toBeInTheDocument();
      expect(screen.getByText(/Uses 100,000 EUR per lot/)).toBeInTheDocument();
      // EUR/USD against an AUD account now needs a USD->AUD rate.
      expect(screen.getByLabelText("AUD per 1 USD")).toBeInTheDocument();
    });

    it("drops the decimals a JPY balance can't have", async () => {
      stubCandles({ JPYUSD: 0.006278 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("JPY");

      await waitFor(() => expect(field("Account balance").value).toBe("1592864"));
      expect(field("Account balance").value).not.toContain(".");
    });

    it("round trips back to the original amount, losslessly", async () => {
      stubCandles({ AUDUSD: 0.70559 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AUD");
      await waitFor(() =>
        expect(field("Account balance").value).toBe("14172.54"),
      );

      selectCurrency("USD");

      // Returning to the currency the box already held converts nothing at all,
      // so not even a rounding cent is lost.
      await waitFor(() => expect(field("Account balance").value).toBe("10000"));
      expect(storedSettings()).toEqual({
        accountBalance: 10000,
        riskPercent: 1,
        accountCurrency: "USD",
        costBufferPercent: 0,
        lotStep: 0.01,
      });
    });

    it("leaves a half-typed balance alone", async () => {
      stubCandles({ AUDUSD: 0.70559 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      fireEvent.change(field("Account balance"), { target: { value: "1." } });
      selectCurrency("AUD");

      await waitFor(() => expect(currency().value).toBe("AUD"));
      expect(field("Account balance").value).toBe("1.");
    });

    it("persists a currency change even while the balance is unusable", async () => {
      stubCandles({ GBPUSD: 1.35077 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      fireEvent.change(field("Account balance"), { target: { value: "" } });
      selectCurrency("GBP");

      // The old persist effect bailed out whenever the balance was unusable,
      // which silently dropped the currency choice.
      await waitFor(() =>
        expect(storedSettings()).toEqual({
          accountBalance: 10000,
          riskPercent: 1,
          accountCurrency: "GBP",
          costBufferPercent: 0,
          lotStep: 0.01,
        }),
      );
    });

    it("composes the rate from both legs when neither is USD", async () => {
      storeCurrency("GBP");
      stubCandles({ JPYUSD: 0.0063694, GBPUSD: 1.35077 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText("Instrument"), {
        target: { value: "EURJPY" },
      });

      // (USD per JPY) / (USD per GBP) = 0.0063694 / 1.35077.
      await waitFor(() =>
        expect(field("GBP per 1 JPY").value).toBe("0.00471538"),
      );
      expect(screen.queryByText(/couldn't be loaded/)).not.toBeInTheDocument();
    });

    it("says which leg failed when the account currency is the unpriceable one", async () => {
      // The pair prices fine; BTC is what the feed can't value.
      stubCandles({ JPYUSD: 0.0063694 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText("Instrument"), {
        target: { value: "EURJPY" },
      });
      selectCurrency("BTC");

      await waitFor(() =>
        expect(
          screen.getByText(
            "Couldn't price BTC. Enter how much BTC 1 JPY is worth.",
          ),
        ).toBeInTheDocument(),
      );
    });

    /**
     * Like stubCandles, but each symbol's response is held open until released,
     * so a conversion can be left in flight while the user acts again.
     */
    function stubDeferredCandles(closes: Record<string, number>) {
      const gates = new Map<string, () => void>();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          const symbol = new URL(url, "http://localhost").searchParams.get(
            "pair",
          )!;
          await new Promise<void>((resolve) => gates.set(symbol, resolve));
          const close = closes[symbol];
          return {
            ok: true,
            json: async () =>
              close === undefined
                ? { bars: [], noData: true }
                : { bars: [{ close }], noData: false },
          } as Response;
        }),
      );
      return {
        release: async (symbol: string) => {
          await waitFor(() => expect(gates.has(symbol)).toBe(true));
          gates.get(symbol)!();
        },
      };
    }

    it("switching twice quickly converts from the amount actually held", async () => {
      // The trap: after the first switch the select reads AUD while the box
      // still holds a USD amount. Converting AUD->JPY there would be wrong by
      // the AUD/USD rate.
      const gate = stubDeferredCandles({ AUDUSD: 0.70559, JPYUSD: 0.006278 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AUD");
      await waitFor(() => expect(currency().value).toBe("AUD"));
      selectCurrency("JPY");

      await gate.release("AUDUSD");
      await gate.release("JPYUSD");

      // 10,000 USD -> JPY directly, not routed through the abandoned AUD hop.
      await waitFor(() =>
        expect(field("Account balance").value).toBe("1592864"),
      );
      expect(currency().value).toBe("JPY");
    });

    it("recovers when a pending switch is superseded by a warm one", async () => {
      // Warm JPY first so the second switch resolves synchronously while the
      // first is still in flight — the ordering that used to strand the panel
      // on "Converting…" forever.
      stubCandles({ JPYUSD: 0.006278 });
      await fetchUsdPerUnit("JPY");

      const gate = stubDeferredCandles({ AUDUSD: 0.70559 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AUD");
      await waitFor(() => expect(currency().value).toBe("AUD"));
      selectCurrency("JPY");

      await waitFor(() =>
        expect(field("Account balance").value).toBe("1592864"),
      );
      expect(screen.queryByText(/Converting your balance/)).not.toBeInTheDocument();

      // The abandoned AUD lookup must not resurrect the converting state.
      await gate.release("AUDUSD");
      await waitFor(() => expect(screen.getByText("Lot size")).toBeInTheDocument());
      expect(storedSettings().accountCurrency).toBe("JPY");
    });

    it("typing a balance cancels a conversion already in flight", async () => {
      const gate = stubDeferredCandles({ AUDUSD: 0.70559 });
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AUD");
      await waitFor(() => expect(currency().value).toBe("AUD"));
      fireEvent.change(field("Account balance"), { target: { value: "500" } });

      await gate.release("AUDUSD");

      // The typed number is already in AUD, so the pending result is discarded.
      await waitFor(() => expect(field("Account balance").value).toBe("500"));
    });

    it("offers Naira and converts at the fixed 1400 without a feed lookup", async () => {
      const fetchMock = stubCandles({});
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      expect(
        Array.from(currency().options).map((option) => option.value),
      ).toContain("NGN");

      selectCurrency("NGN");

      // USD is identity and NGN is static, so both peekUsdPerUnit legs are
      // warm and the 10,000 → 14,000,000 conversion is synchronous.
      await waitFor(() =>
        expect(field("Account balance").value).toBe("14000000"),
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByLabelText("NGN per 1 USD")).toBeInTheDocument();
      await waitFor(() =>
        expect(field("NGN per 1 USD").value).toBe("1400"),
      );
      // Risk scales with the balance, so the lot size stays 0.33.
      expect(screen.getByText("0.33")).toBeInTheDocument();
      expect(storedSettings().accountCurrency).toBe("NGN");
    });

    it("warns rather than silently relabelling when the balance can't convert", async () => {
      stubCandles({});
      render(<LotSizeCalculatorModal signal={makeSignal()} onClose={() => {}} />);

      selectCurrency("AED");

      await waitFor(() =>
        expect(screen.getByText(/Couldn't convert your balance to AED/)).
          toBeInTheDocument(),
      );
      expect(field("Account balance").value).toBe("10000");
      expect(currency().value).toBe("AED");
    });
  });
});
