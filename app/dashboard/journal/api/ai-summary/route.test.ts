import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Journal } from "@/components/journal/journal-types";
import { POST } from "./route";

// Regression: ISSUE-001 — AI summary used the wrong provider and ignored journal history
// Found by /qa on 2026-07-28
// Report: /tmp/signova-journal-qa-2026-07-28/qa-report-localhost-2026-07-28.md

const fetchMock = vi.fn<typeof fetch>();
const originalOpenAiKey = process.env.OPENAI_API_KEY;

function buildJournal(historyCount = 2): Journal {
  const rows = Array.from({ length: historyCount + 1 }, (_, index) => ({
    id: index === historyCount ? "current-row" : `history-${index + 1}`,
    cells: {
      pair: index === historyCount ? "EUR/USD" : `PAIR-${index + 1}`,
      result: index % 2 === 0 ? "Win" : "Loss",
      notes:
        index === historyCount
          ? "Waited for confirmation."
          : `Historical note ${index + 1}`,
    },
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));

  return {
    _id: "journal-1",
    userId: "user-1",
    title: "Trading Journal",
    isDefault: true,
    properties: [
      { id: "pair", name: "Pair", type: "text" },
      {
        id: "result",
        name: "Result",
        type: "select",
        options: [],
      },
      { id: "notes", name: "Notes", type: "text" },
      {
        id: "summary",
        name: "AI summary",
        type: "ai",
        ai: {
          kind: "summary",
          model: "gpt-5.4-mini",
          sourcePropertyIds: [],
        },
      },
    ],
    views: [{ id: "table", name: "Table", type: "table" }],
    rows,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  };
}

function summaryRequest(withAuth = true): Request {
  return new Request("http://localhost/dashboard/journal/api/ai-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? { Authorization: "Bearer test-token" } : {}),
    },
    body: JSON.stringify({
      journalId: "journal-1",
      rowId: "current-row",
      propertyId: "summary",
    }),
  });
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-openai-key";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  if (originalOpenAiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
  }
  vi.unstubAllGlobals();
});

describe("journal AI summary route", () => {
  it("uses gpt-5.4-mini, includes recent trade history, and saves the summary", async () => {
    const journal = buildJournal();
    const updatedJournal = {
      ...journal,
      rows: journal.rows.map((row) =>
        row.id === "current-row"
          ? { ...row, cells: { ...row.cells, summary: "Disciplined entry." } }
          : row,
      ),
    };

    fetchMock
      .mockResolvedValueOnce(
        Response.json({ success: true, journal }),
      )
      .mockResolvedValueOnce(
        Response.json({
          output: [
            {
              content: [
                { type: "output_text", text: "Disciplined entry." },
              ],
            },
          ],
          usage: { input_tokens: 120, output_tokens: 18 },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ success: true, journal: updatedJournal }),
      );

    const response = await POST(summaryRequest());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      success: true,
      value: "Disciplined entry.",
      model: "gpt-5.4-mini",
      historyRows: 2,
      usage: { tokensIn: 120, tokensOut: 18 },
    });

    const openAiCall = fetchMock.mock.calls[1];
    expect(openAiCall?.[0]).toBe("https://api.openai.com/v1/responses");
    const openAiBody = JSON.parse(String(openAiCall?.[1]?.body));
    expect(openAiBody).toMatchObject({
      model: "gpt-5.4-mini",
      store: false,
      max_output_tokens: 700,
    });
    expect(openAiBody.input[1].content).toContain("Current trade:");
    expect(openAiBody.input[1].content).toContain("PAIR-1");
    expect(openAiBody.input[1].content).toContain("PAIR-2");
    expect(openAiBody.input[1].content).toContain("Recent journal history (2 of 2 earlier trades)");

    const updateCall = fetchMock.mock.calls[2];
    expect(updateCall?.[1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(updateCall?.[1]?.body))).toEqual({
      cells: { summary: "Disciplined entry." },
    });
  });

  it("limits the model context to the 100 most recently updated historical trades", async () => {
    const journal = buildJournal(102);
    fetchMock
      .mockResolvedValueOnce(Response.json({ success: true, journal }))
      .mockResolvedValueOnce(
        Response.json({ output_text: "History-aware summary." }),
      )
      .mockResolvedValueOnce(Response.json({ success: true, journal }));

    const response = await POST(summaryRequest());
    const result = await response.json();
    const openAiBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    );

    expect(response.status).toBe(200);
    expect(result.historyRows).toBe(100);
    expect(openAiBody.input[1].content).toContain("PAIR-102");
    expect(openAiBody.input[1].content).not.toContain("PAIR-1\n");
    expect(openAiBody.input[1].content).not.toContain("PAIR-2\n");
  });

  it("rejects unauthenticated requests before calling either provider", async () => {
    const response = await POST(summaryRequest(false));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Log in to generate an AI summary",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
