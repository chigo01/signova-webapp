import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuthState } from "./auth-provider";

vi.mock("@/components/auth/auth-modal", () => ({
  AuthModal: () => null,
}));

function AuthProbe() {
  const { isAuthenticated, isGuest, isLoading } = useAuthState();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="guest">{String(isGuest)}</span>
    </div>
  );
}

function setToken(value = "valid.jwt.token") {
  document.cookie = `auth_token=${value}; path=/`;
}

beforeEach(() => {
  document.cookie = "auth_token=; path=/; max-age=0";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.cookie = "auth_token=; path=/; max-age=0";
});

describe("AuthProvider session validation", () => {
  it("keeps a token-backed session authenticated during a server failure", async () => {
    setToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
      expect(screen.getByTestId("guest")).toHaveTextContent("false");
    });
    expect(document.cookie).toContain("auth_token=valid.jwt.token");
  });

  it("keeps a token-backed session authenticated during a network failure", async () => {
    setToken();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
      expect(screen.getByTestId("guest")).toHaveTextContent("false");
    });
  });

  it("retries a temporary failure and accepts the recovered response", async () => {
    vi.useFakeTimers();
    setToken();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
  });

  it("clears a session only when the server explicitly returns 401", async () => {
    setToken("expired.jwt.token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
      expect(screen.getByTestId("guest")).toHaveTextContent("true");
    });
    expect(document.cookie).not.toContain("auth_token=");
  });

  it("treats a successful auth check as authenticated", async () => {
    setToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
      expect(screen.getByTestId("guest")).toHaveTextContent("false");
    });
  });
});
