/** Stable key for deduplicating offline sync operations across retries. */
export function syncOperationKey(
  deviceId: string,
  operation: string,
  entityId: string,
  clientOpId: string
): string {
  return `${deviceId}::${clientOpId || `${operation}::${entityId}`}`;
}

export function dedupeOperations<T extends { id: string; operation: string; entityId: string }>(
  operations: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const op of operations) {
    const key = `${op.operation}::${op.entityId}::${op.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(op);
  }
  return out;
}
