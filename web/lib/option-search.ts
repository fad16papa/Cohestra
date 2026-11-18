export type SearchableOption = {
  value: string;
  label: string;
  keywords?: string;
};

export function filterSearchableOptions<T extends SearchableOption>(
  options: readonly T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase().replace(/^\+/, "");
  if (!normalized) {
    return [...options];
  }

  const digitQuery = /^\d+$/.test(normalized);

  return options.filter((option) => {
    const keywords = (option.keywords ?? "").toLowerCase();
    if (digitQuery) {
      const codes = keywords.match(/\d+/g) ?? [];
      return codes.some((code) => code.startsWith(normalized));
    }

    const haystack = `${option.label} ${keywords} ${option.value}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function nextListboxIndex(
  current: number,
  length: number,
  key: "ArrowDown" | "ArrowUp" | "Home" | "End"
): number {
  if (length <= 0) {
    return -1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return length - 1;
  }

  if (key === "ArrowDown") {
    return Math.min(current + 1, length - 1);
  }

  return Math.max(current - 1, 0);
}
