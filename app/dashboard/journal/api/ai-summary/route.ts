import { API_URL } from "@/lib/config";
import type {
  Journal,
  JournalProperty,
  JournalRow,
} from "@/components/journal/journal-types";

export const runtime = "nodejs";

const AI_SUMMARY_MODEL = "gpt-5.4-mini";
const MAX_HISTORY_ROWS = 100;
const MAX_CELL_CHARS = 500;

type SummaryRequest = {
  journalId?: unknown;
  rowId?: unknown;
  propertyId?: unknown;
};

type OpenAiResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
  };
};

function jsonError(message: string, status: number): Response {
  return Response.json({ success: false, message }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function textValue(value: unknown): string {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  const trimmed = text.trim();
  return trimmed.length > MAX_CELL_CHARS
    ? `${trimmed.slice(0, MAX_CELL_CHARS)}…`
    : trimmed;
}

function sourceProperties(
  journal: Journal,
  summaryProperty: JournalProperty,
): JournalProperty[] {
  const configuredIds = summaryProperty.ai?.sourcePropertyIds ?? [];
  return journal.properties.filter((property) => {
    if (property.id === summaryProperty.id || property.type === "ai") {
      return false;
    }
    if (configuredIds.length > 0) return configuredIds.includes(property.id);
    return !property.hidden;
  });
}

function renderRow(row: JournalRow, properties: JournalProperty[]): string {
  const details = properties
    .map((property) => {
      const value = textValue(row.cells[property.id]);
      return value ? `- ${property.name}: ${value}` : null;
    })
    .filter((line): line is string => Boolean(line));

  return details.length > 0 ? details.join("\n") : "- No trade details recorded";
}

function validTime(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function buildSummaryPrompt(
  journal: Journal,
  targetRow: JournalRow,
  summaryProperty: JournalProperty,
): { system: string; user: string; historyRows: number } {
  const properties = sourceProperties(journal, summaryProperty);
  const history = journal.rows
    .filter((row) => row.id !== targetRow.id)
    .sort((a, b) => validTime(b.updatedAt) - validTime(a.updatedAt))
    .slice(0, MAX_HISTORY_ROWS);

  const historyText = history.length
    ? history
        .map(
          (row, index) =>
            `Historical trade ${index + 1} (${row.createdAt}):\n${renderRow(row, properties)}`,
        )
        .join("\n\n")
    : "No earlier journal trades are available.";

  const requestedSummary =
    summaryProperty.ai?.prompt?.trim() ||
    "Summarize the current trade in 2-4 sentences. Use the historical trades to identify one recurring pattern when the evidence supports it.";

  return {
    system:
      "You are a careful trading-journal analyst. Use only the supplied journal data. " +
      "Separate facts about the current trade from patterns across historical trades. " +
      "Do not invent prices, outcomes, causes, or patterns. If history is too limited for a reliable pattern, say so briefly. " +
      "Return only the summary, with no heading or preamble.",
    user: `${requestedSummary}\n\nCurrent trade:\n${renderRow(targetRow, properties)}\n\nRecent journal history (${history.length} of ${journal.rows.length - 1} earlier trades):\n${historyText}`,
    historyRows: history.length,
  };
}

function extractOutputText(response: OpenAiResponse): string {
  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .join("")
    .trim();
}

export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonError("Log in to generate an AI summary", 401);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      "AI summary is not configured. Set OPENAI_API_KEY on the web app server.",
      503,
    );
  }

  let body: SummaryRequest;
  try {
    body = (await request.json()) as SummaryRequest;
  } catch {
    return jsonError("Invalid AI summary request", 400);
  }

  if (
    !isNonEmptyString(body.journalId) ||
    !isNonEmptyString(body.rowId) ||
    !isNonEmptyString(body.propertyId)
  ) {
    return jsonError("journalId, rowId, and propertyId are required", 400);
  }

  const backendHeaders = {
    Authorization: authorization,
    "Content-Type": "application/json",
  };
  const journalId = encodeURIComponent(body.journalId);

  const journalResponse = await fetch(`${API_URL}/journal/${journalId}`, {
    headers: backendHeaders,
    cache: "no-store",
  });
  if (!journalResponse.ok) {
    return jsonError(
      journalResponse.status === 404
        ? "Journal not found"
        : "Could not load the journal for AI summary",
      journalResponse.status === 401 || journalResponse.status === 403
        ? journalResponse.status
        : 502,
    );
  }

  const journalData = (await journalResponse.json()) as {
    success?: unknown;
    journal?: Journal;
  };
  const journal = journalData.journal;
  if (!journalData.success || !journal) {
    return jsonError("Invalid journal response", 502);
  }

  const targetRow = journal.rows.find((row) => row.id === body.rowId);
  const summaryProperty = journal.properties.find(
    (property) => property.id === body.propertyId,
  );
  if (!targetRow) return jsonError("Journal row not found", 404);
  if (
    !summaryProperty ||
    summaryProperty.type !== "ai" ||
    summaryProperty.ai?.kind !== "summary"
  ) {
    return jsonError("Property is not an AI summary column", 400);
  }

  const prompt = buildSummaryPrompt(journal, targetRow, summaryProperty);
  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_SUMMARY_MODEL,
      store: false,
      max_output_tokens: 700,
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!openAiResponse.ok) {
    return jsonError("OpenAI could not generate the journal summary", 502);
  }

  const openAiData = (await openAiResponse.json()) as OpenAiResponse;
  const value = extractOutputText(openAiData);
  if (!value) return jsonError("OpenAI returned an empty summary", 502);

  const rowId = encodeURIComponent(body.rowId);
  const updateResponse = await fetch(
    `${API_URL}/journal/${journalId}/rows/${rowId}`,
    {
      method: "PATCH",
      headers: backendHeaders,
      body: JSON.stringify({ cells: { [body.propertyId]: value } }),
    },
  );
  if (!updateResponse.ok) {
    return jsonError("Summary was generated but could not be saved", 502);
  }

  const updateData = (await updateResponse.json()) as {
    success?: unknown;
    journal?: Journal;
  };
  if (!updateData.success || !updateData.journal) {
    return jsonError("Invalid journal update response", 502);
  }

  return Response.json({
    success: true,
    journal: updateData.journal,
    value,
    model: AI_SUMMARY_MODEL,
    historyRows: prompt.historyRows,
    usage: {
      tokensIn:
        typeof openAiData.usage?.input_tokens === "number"
          ? openAiData.usage.input_tokens
          : 0,
      tokensOut:
        typeof openAiData.usage?.output_tokens === "number"
          ? openAiData.usage.output_tokens
          : 0,
    },
  });
}
