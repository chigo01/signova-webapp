import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";

// Implements TradingView's IExternalSaveLoadAdapter
// (see out/charting_library/charting_library.d.ts) backed by Signova's
// per-user /chart-presets API. The widget calls these methods whenever a
// trader saves or loads a layout / study template / drawing template / chart
// template, so presets persist server-side and follow the user across devices.

// Local mirrors of the Charting Library types (the library is loaded via a
// script tag, not as a module, so we don't import its .d.ts here).
interface ChartMetaInfo {
  id: number | string;
  name: string;
  symbol: string;
  resolution: string;
  timestamp: number;
}

interface ChartData {
  id?: string | number;
  name: string;
  symbol: string;
  resolution: string;
  content: string;
  timestamp: number;
}

interface StudyTemplateData {
  name: string;
  content: string;
}

interface StudyTemplateMetaInfo {
  name: string;
}

interface ChartTemplate {
  content?: unknown;
}

const BASE = `${API_URL}/chart-presets`;

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

async function readJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${label} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function createSaveLoadAdapter() {
  return {
    // ----- Chart layouts -----

    async getAllCharts(): Promise<ChartMetaInfo[]> {
      const res = await fetch(`${BASE}/layouts`, { headers: jsonHeaders() });
      const data = await readJson<{ layouts: ChartMetaInfo[] }>(
        res,
        "Load charts",
      );
      return data.layouts ?? [];
    },

    async saveChart(chartData: ChartData): Promise<string | number> {
      const res = await fetch(`${BASE}/layouts`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          id: chartData.id != null ? String(chartData.id) : undefined,
          name: chartData.name,
          symbol: chartData.symbol,
          resolution: chartData.resolution,
          content: chartData.content,
        }),
      });
      const data = await readJson<{ id: string }>(res, "Save chart");
      return data.id;
    },

    async getChartContent(chartId: number | string): Promise<string> {
      const res = await fetch(`${BASE}/layouts/${chartId}`, {
        headers: jsonHeaders(),
      });
      const data = await readJson<{ content: string }>(res, "Load chart");
      return data.content;
    },

    async removeChart(id: string | number): Promise<void> {
      const res = await fetch(`${BASE}/layouts/${id}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      await readJson(res, "Remove chart");
    },

    // ----- Study templates -----

    async getAllStudyTemplates(): Promise<StudyTemplateMetaInfo[]> {
      const res = await fetch(`${BASE}/study-templates`, {
        headers: jsonHeaders(),
      });
      const data = await readJson<{ templates: StudyTemplateMetaInfo[] }>(
        res,
        "Load study templates",
      );
      return data.templates ?? [];
    },

    async saveStudyTemplate(studyTemplateData: StudyTemplateData): Promise<void> {
      const res = await fetch(`${BASE}/study-templates`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(studyTemplateData),
      });
      await readJson(res, "Save study template");
    },

    async getStudyTemplateContent(
      studyTemplateInfo: StudyTemplateMetaInfo,
    ): Promise<string> {
      const res = await fetch(
        `${BASE}/study-templates/content?name=${encodeURIComponent(
          studyTemplateInfo.name,
        )}`,
        { headers: jsonHeaders() },
      );
      const data = await readJson<{ content: string }>(
        res,
        "Load study template",
      );
      return data.content;
    },

    async removeStudyTemplate(
      studyTemplateInfo: StudyTemplateMetaInfo,
    ): Promise<void> {
      const res = await fetch(
        `${BASE}/study-templates?name=${encodeURIComponent(
          studyTemplateInfo.name,
        )}`,
        { method: "DELETE", headers: jsonHeaders() },
      );
      await readJson(res, "Remove study template");
    },

    // ----- Drawing templates -----

    async getDrawingTemplates(toolName: string): Promise<string[]> {
      const res = await fetch(
        `${BASE}/drawing-templates?toolName=${encodeURIComponent(toolName)}`,
        { headers: jsonHeaders() },
      );
      const data = await readJson<{ names: string[] }>(
        res,
        "Load drawing templates",
      );
      return data.names ?? [];
    },

    async saveDrawingTemplate(
      toolName: string,
      templateName: string,
      content: string,
    ): Promise<void> {
      const res = await fetch(`${BASE}/drawing-templates`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ toolName, name: templateName, content }),
      });
      await readJson(res, "Save drawing template");
    },

    async loadDrawingTemplate(
      toolName: string,
      templateName: string,
    ): Promise<string> {
      const res = await fetch(
        `${BASE}/drawing-templates/content?toolName=${encodeURIComponent(
          toolName,
        )}&name=${encodeURIComponent(templateName)}`,
        { headers: jsonHeaders() },
      );
      const data = await readJson<{ content: string }>(
        res,
        "Load drawing template",
      );
      return data.content;
    },

    async removeDrawingTemplate(
      toolName: string,
      templateName: string,
    ): Promise<void> {
      const res = await fetch(
        `${BASE}/drawing-templates?toolName=${encodeURIComponent(
          toolName,
        )}&name=${encodeURIComponent(templateName)}`,
        { method: "DELETE", headers: jsonHeaders() },
      );
      await readJson(res, "Remove drawing template");
    },

    // ----- Chart templates (styling) -----

    async getAllChartTemplates(): Promise<string[]> {
      const res = await fetch(`${BASE}/chart-templates`, {
        headers: jsonHeaders(),
      });
      const data = await readJson<{ names: string[] }>(
        res,
        "Load chart templates",
      );
      return data.names ?? [];
    },

    async saveChartTemplate(
      newName: string,
      theme: unknown,
    ): Promise<void> {
      const res = await fetch(`${BASE}/chart-templates`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: newName, content: theme }),
      });
      await readJson(res, "Save chart template");
    },

    async getChartTemplateContent(templateName: string): Promise<ChartTemplate> {
      const res = await fetch(
        `${BASE}/chart-templates/content?name=${encodeURIComponent(
          templateName,
        )}`,
        { headers: jsonHeaders() },
      );
      const data = await readJson<{ content: unknown }>(
        res,
        "Load chart template",
      );
      return { content: data.content };
    },

    async removeChartTemplate(templateName: string): Promise<void> {
      const res = await fetch(
        `${BASE}/chart-templates?name=${encodeURIComponent(templateName)}`,
        { method: "DELETE", headers: jsonHeaders() },
      );
      await readJson(res, "Remove chart template");
    },
  };
}
