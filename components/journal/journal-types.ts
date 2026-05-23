export type JournalPropertyType =
  | "text"
  | "date"
  | "select"
  | "multi-select"
  | "number"
  | "ai";

export type JournalViewType =
  | "table"
  | "calendar"
  | "board"
  | "gallery"
  | "list";

export type JournalAiKind = "summary" | "key-info" | "custom" | "translation";

export interface JournalPropertyOption {
  id: string;
  label: string;
  color: string;
}

export interface JournalAiConfig {
  kind: JournalAiKind;
  prompt?: string;
  targetLanguage?: string;
  sourcePropertyIds?: string[];
  model?: string;
}

export interface JournalProperty {
  id: string;
  name: string;
  type: JournalPropertyType;
  options?: JournalPropertyOption[];
  width?: number;
  hidden?: boolean;
  ai?: JournalAiConfig;
}

export interface JournalView {
  id: string;
  name: string;
  type: JournalViewType;
}

export interface JournalRow {
  id: string;
  cells: Record<string, unknown>;
  linkedSignalPlayId?: string;
  sourceSignalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Journal {
  _id: string;
  userId: string;
  title: string;
  isDefault: boolean;
  properties: JournalProperty[];
  views: JournalView[];
  rows: JournalRow[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalApiResponse {
  success: boolean;
  journal: Journal;
}

export interface ImportSignalPlaysResponse extends JournalApiResponse {
  importedCount: number;
}

export interface JournalSummary {
  _id: string;
  title: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface JournalListResponse {
  success: boolean;
  journals: JournalSummary[];
}
