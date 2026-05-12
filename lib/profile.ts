export const PROFILE_ROLES = [
  "Trader",
  "Active Options Trader",
  "Swing Trader",
  "Analyst",
  "Business Developer",
  "Exchange Rate Analyst",
  "Trade Specialist",
] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;
export const NAME_MAX = 60;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export const AVATAR_MAX_DATA_URL_LENGTH = 700_000;
export const AVATAR_OUTPUT_SIZE = 256;
export const AVATAR_JPEG_QUALITY = 0.85;
