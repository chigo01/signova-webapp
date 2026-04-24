export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://web-server-4gpe.onrender.com";

export const ADMIN_API_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  "https://admin-server-syol.onrender.com";

export const TV_DATAFEED_URL =
  process.env.NEXT_PUBLIC_TV_DATAFEED_URL || `${API_URL}/tv`;

export const ANALYSIS_API_URL =
  process.env.NEXT_PUBLIC_FOREX_ANALYSIS_URL || `${API_URL}/analysis`;
