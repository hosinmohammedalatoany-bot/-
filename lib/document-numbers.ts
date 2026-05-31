export type DocumentPrefix = "INV" | "CON" | "REC" | "RES" | "REP";

const counters: Record<DocumentPrefix, number> = {
  INV: 1,
  CON: 1,
  REC: 1,
  RES: 1,
  REP: 1
};

export function nextDocumentNumber(prefix: DocumentPrefix, existingNumbers: string[] = []) {
  const max = existingNumbers.reduce((acc, num) => {
    const match = num.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      return acc;
    }
    return Math.max(acc, Number(match[1]));
  }, counters[prefix] - 1);

  const next = max + 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}
