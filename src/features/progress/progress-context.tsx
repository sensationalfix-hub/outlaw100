'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createLocalProgressBackup, parseProgressExport, serializeProgressExport } from './local-backup';
import { createSupabaseProgressRepository } from './repository';
import { CanonicalProgressStore } from './store';
import { EMPTY_PROGRESS_SNAPSHOT, type ProgressSnapshot, type ProgressStatus } from './types';

type ProgressContextValue = {
  snapshot: ProgressSnapshot;
  ready: boolean;
  error: string | null;
  setCriterionStatus(id: string, status: ProgressStatus): Promise<void>;
  setTaskStatus(id: string, status: ProgressStatus): Promise<void>;
  setInventoryQuantity(id: string, quantity: number): Promise<void>;
  setMilestoneStatus(milestoneId: string, criterionIds: string[], taskIds: string[], status: ProgressStatus): Promise<void>;
  exportJson(): string;
  importJson(raw: string): Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(EMPTY_PROGRESS_SNAPSHOT);
  const [store, setStore] = useState<CanonicalProgressStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const repository = createSupabaseProgressRepository(supabase as any, userId);
    const backup = createLocalProgressBackup(window.localStorage, `outlaw100:progress:v1:${userId}`);
    const nextStore = new CanonicalProgressStore(repository, backup);
    setStore(nextStore);
    const unsubscribe = nextStore.subscribe(() => setSnapshot({ ...nextStore.getSnapshot(), criteria: { ...nextStore.getSnapshot().criteria }, tasks: { ...nextStore.getSnapshot().tasks }, inventory: { ...nextStore.getSnapshot().inventory } }));
    nextStore.hydrate()
      .then(() => setSnapshot(nextStore.getSnapshot()))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo recuperar el progreso'))
      .finally(() => setReady(true));
    return unsubscribe;
  }, [userId]);

  const value = useMemo<ProgressContextValue>(() => ({
    snapshot,
    ready,
    error,
    async setCriterionStatus(id, status) {
      if (!store) return;
      setError(null);
      try { await store.setCriterionStatus(id, status); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el criterio'); }
    },
    async setTaskStatus(id, status) {
      if (!store) return;
      setError(null);
      try { await store.setMilestoneTaskStatus(id, status); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la tarea'); }
    },
    async setInventoryQuantity(id, quantity) {
      if (!store) return;
      setError(null);
      try { await store.setInventoryQuantity(id, quantity); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el inventario'); }
    },
    async setMilestoneStatus(milestoneId, criterionIds, taskIds, status) {
      if (!store) return;
      setError(null);
      try { await store.setMilestoneStatus(milestoneId, criterionIds, taskIds, status); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el hito'); }
    },
    exportJson() {
      return serializeProgressExport(snapshot);
    },
    async importJson(raw) {
      if (!store) return;
      const next = parseProgressExport(raw);
      await store.importSnapshot(next);
    },
  }), [snapshot, ready, error, store, userId]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress debe usarse dentro de ProgressProvider');
  return value;
}
