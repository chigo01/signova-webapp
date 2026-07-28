import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WatchlistResponse } from "@/lib/stocks";
import { WatchlistDeliveryHealth } from "./personal-watchlist";

const baseData: WatchlistResponse = {
  items: [],
  effectivePlan: "free",
  limit: 3,
  activeCount: 0,
  preferences: {
    delivery: "daily",
    timezone: "Africa/Lagos",
    changedAt: "2026-07-14T06:00:00.000Z",
  },
  deliveryHealth: {
    availability: "scheduled",
    lastRunStatus: "completed",
    lastRunAt: "2026-07-14T07:00:00.000Z",
    lastSentAt: null,
  },
};

describe("WatchlistDeliveryHealth", () => {
  it("shows a completed check without implying an email was sent", () => {
    render(<WatchlistDeliveryHealth data={baseData} />);

    expect(screen.getByText(/last checked/i)).toBeInTheDocument();
    expect(screen.queryByText(/last email sent/i)).not.toBeInTheDocument();
  });

  it("shows the last successful email when one exists", () => {
    render(
      <WatchlistDeliveryHealth
        data={{
          ...baseData,
          deliveryHealth: {
            ...baseData.deliveryHealth,
            lastSentAt: "2026-07-13T07:01:00.000Z",
          },
        }}
      />,
    );

    expect(screen.getByText(/last email sent/i)).toBeInTheDocument();
  });

  it("warns when configured delivery is unavailable", () => {
    render(
      <WatchlistDeliveryHealth
        data={{
          ...baseData,
          deliveryHealth: {
            availability: "misconfigured",
            lastRunStatus: null,
            lastRunAt: null,
            lastSentAt: null,
          },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /news alerts are temporarily unavailable/i,
    );
  });
});
