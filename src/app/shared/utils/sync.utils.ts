export type SyncResolution = 'conflict' | 'retry';

export const MAX_SYNC_ATTEMPTS = 5;

export function newId(): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

function readField(error: unknown, field: string): string | undefined {
  if (error && typeof error === 'object' && field in error) {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * Decides whether a failed sync operation reflects a permanent business-rule
 * conflict (needs user action, must not retry blindly) or a transient error
 * that can be retried later (e.g. network/timeout).
 */
export function classifySyncError(error: unknown): SyncResolution {
  const code = readField(error, 'code');
  const message = readField(error, 'message') ?? '';

  if (code === '23505' || code === '23503' || code === '23514' || code === 'P0001') {
    return 'conflict';
  }

  if (
    /period[_ ]?closed|room[_ ]?archived|archived|closed month|inactive|duplicate|already (exists|used)|not a member|forbidden|permission denied/i.test(
      message,
    )
  ) {
    return 'conflict';
  }

  return 'retry';
}
