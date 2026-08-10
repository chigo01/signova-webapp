import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountDeletionApiError,
  daysUntilDeletion,
  formatDeletionDate,
  parsePendingDeletion,
  requestAccountDeletion,
  revokeAccountDeletion,
} from "./account-deletion";
import { getAuthUserProfile, setAuthUserProfile } from "./auth-user";

// Node 22 exposes its own experimental `localStorage` global, which shadows
// jsdom's and is inert without --localstorage-file. Stub a working in-memory
// Storage so the cache round trip exercises real read/write behaviour.
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
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parsePendingDeletion", () => {
  it("reads a well-formed pending deletion", () => {
    expect(
      parsePendingDeletion({
        requestedAt: "2026-08-10T00:00:00.000Z",
        scheduledFor: "2026-09-09T00:00:00.000Z",
      }),
    ).toEqual({
      requestedAt: "2026-08-10T00:00:00.000Z",
      scheduledFor: "2026-09-09T00:00:00.000Z",
    });
  });

  it("returns null for a clean account", () => {
    expect(parsePendingDeletion(null)).toBeNull();
    expect(parsePendingDeletion(undefined)).toBeNull();
  });

  it("returns null rather than a dateless banner", () => {
    // Without a scheduledFor there is nothing to display or count down to, so
    // showing "your account is being deleted" would be worse than showing
    // nothing at all.
    expect(parsePendingDeletion({})).toBeNull();
    expect(parsePendingDeletion({ requestedAt: "2026-08-10" })).toBeNull();
    expect(parsePendingDeletion({ scheduledFor: "" })).toBeNull();
    expect(parsePendingDeletion({ scheduledFor: 123 })).toBeNull();
    expect(parsePendingDeletion(["2026-09-09"])).toBeNull();
    expect(parsePendingDeletion("2026-09-09")).toBeNull();
  });

  it("drops a malformed requestedAt but keeps the usable date", () => {
    expect(
      parsePendingDeletion({ scheduledFor: "2026-09-09", requestedAt: 5 }),
    ).toEqual({ scheduledFor: "2026-09-09" });
  });
});

describe("daysUntilDeletion", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");

  it("counts whole days remaining", () => {
    expect(
      daysUntilDeletion({ scheduledFor: "2026-09-09T00:00:00.000Z" }, now),
    ).toBe(30);
    expect(
      daysUntilDeletion({ scheduledFor: "2026-08-11T00:00:00.000Z" }, now),
    ).toBe(1);
  });

  it("rounds a partial day up so the last day still reads as a day left", () => {
    expect(
      daysUntilDeletion({ scheduledFor: "2026-08-10T06:00:00.000Z" }, now),
    ).toBe(1);
  });

  it("never goes negative once the date has passed", () => {
    expect(
      daysUntilDeletion({ scheduledFor: "2026-08-01T00:00:00.000Z" }, now),
    ).toBe(0);
    expect(daysUntilDeletion({ scheduledFor: "not-a-date" }, now)).toBe(0);
    expect(daysUntilDeletion({}, now)).toBe(0);
  });
});

describe("formatDeletionDate", () => {
  it("degrades to a neutral word rather than showing Invalid Date", () => {
    expect(formatDeletionDate({ scheduledFor: "not-a-date" })).toBe("soon");
    expect(formatDeletionDate({})).toBe("soon");
  });
});

describe("requestAccountDeletion", () => {
  it("posts the web platform and returns the parsed schedule", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        pendingDeletion: {
          requestedAt: "2026-08-10T00:00:00.000Z",
          scheduledFor: "2026-09-09T00:00:00.000Z",
        },
        graceDays: 30,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAccountDeletion("too many emails");

    expect(result.graceDays).toBe(30);
    expect(result.pendingDeletion?.scheduledFor).toBe(
      "2026-09-09T00:00:00.000Z",
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/account/delete");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      platform: "web",
      reason: "too many emails",
    });
  });

  it("omits the reason when the user did not give one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pendingDeletion: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestAccountDeletion();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      platform: "web",
    });
  });

  it("surfaces the server's message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: "Too many requests." }),
      }),
    );

    await expect(requestAccountDeletion()).rejects.toThrow(
      AccountDeletionApiError,
    );
    await expect(requestAccountDeletion()).rejects.toThrow(
      "Too many requests.",
    );
  });

  it("still throws when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(requestAccountDeletion()).rejects.toThrow(
      "Request failed (500)",
    );
  });
});

describe("revokeAccountDeletion", () => {
  it("reports whether a request was actually outstanding", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ revoked: true, pendingDeletion: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokeAccountDeletion()).resolves.toEqual({ revoked: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/auth/account/delete/revoke",
    );
  });

  it("does not treat a no-op revoke as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ revoked: false }),
      }),
    );

    await expect(revokeAccountDeletion()).resolves.toEqual({ revoked: false });
  });
});

describe("cached pending deletion", () => {
  it("survives the localStorage round trip, including an explicit null", () => {
    setAuthUserProfile({
      email: "trader@example.com",
      pendingDeletion: { scheduledFor: "2026-09-09T00:00:00.000Z" },
    });
    expect(getAuthUserProfile()?.pendingDeletion).toEqual({
      scheduledFor: "2026-09-09T00:00:00.000Z",
    });

    // The null written after a successful revoke must not be dropped by the
    // cache's field validation, or the banner would come back on reload.
    setAuthUserProfile({ email: "trader@example.com", pendingDeletion: null });
    expect(getAuthUserProfile()?.pendingDeletion).toBeNull();
  });
});
