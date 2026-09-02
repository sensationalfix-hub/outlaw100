import { PROGRESS_STATUSES, type ProgressBackup, type ProgressSnapshot } from './types.ts';

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const DEFAULT_KEY = 'outlaw100:progress:v1';
const statusSet = new Set<string>(PROGRESS_STATUSES);

function normalizeSnapshot(value: unknown): ProgressSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Formato de progreso no válido');
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) throw new Error('Versión de progreso no compatible');

  const normalizeStatuses = (input: unknown): ProgressSnapshot['criteria'] => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const out: ProgressSnapshot['criteria'] = {};
    for (const [key, status] of Object.entries(input as Record<string, unknown>)) {
      if (typeof status === 'string' && statusSet.has(status)) out[key] = status as ProgressSnapshot['criteria'][string];
    }
    return out;
  };

  const inventory: Record<string, number> = {};
  if (candidate.inventory && typeof candidate.inventory === 'object' && !Array.isArray(candidate.inventory)) {
    for (const [key, quantity] of Object.entries(candidate.inventory as Record<string, unknown>)) {
      if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0) inventory[key] = quantity;
    }
  }

  return {
    version: 1,
    criteria: normalizeStatuses(candidate.criteria),
    tasks: normalizeStatuses(candidate.tasks),
    inventory,
  };
}

export function serializeProgressExport(snapshot: ProgressSnapshot): string {
  return JSON.stringify(normalizeSnapshot(snapshot), null, 2);
}

export function parseProgressExport(raw: string): ProgressSnapshot {
  return normalizeSnapshot(JSON.parse(raw));
}

export function createLocalProgressBackup(storage: StorageLike, key = DEFAULT_KEY): ProgressBackup {
  return {
    load() {
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        return parseProgressExport(raw);
      } catch {
        return null;
      }
    },
    save(snapshot) {
      storage.setItem(key, serializeProgressExport(snapshot));
    },
    clear() {
      storage.removeItem(key);
    },
  };
}
