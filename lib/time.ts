export function relativeTime(input: string | number | Date): string {
  const ms =
    typeof input === "number"
      ? input
      : input instanceof Date
        ? input.getTime()
        : new Date(input).getTime();
  const diff = Date.now() - ms;
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
