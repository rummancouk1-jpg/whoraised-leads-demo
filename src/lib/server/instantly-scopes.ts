export function scopesCover(granted: unknown, required: readonly string[]): boolean {
  if (!Array.isArray(granted) || !granted.every(scope => typeof scope === "string")) return false;
  return granted.includes("all:all") || required.every(scope => granted.includes(scope));
}
