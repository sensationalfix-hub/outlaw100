'use client';

import { PROGRESS_STATUSES, type ProgressStatus } from './types';

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'No iniciado',
  available: 'Disponible',
  in_progress: 'En progreso',
  prepared: 'Preparado',
  completable: 'Completable',
  completed: 'Completado',
  blocked: 'Perdido / bloqueado',
};

export function ProgressStatusSelect({
  value,
  onChange,
  label = 'Estado',
}: {
  value: ProgressStatus;
  onChange(value: ProgressStatus): void | Promise<void>;
  label?: string;
}) {
  return <label className={`progress-status status-${value}`} title={label}>
    <span className="sr-only">{label}</span>
    <select value={value} onChange={(event) => void onChange(event.target.value as ProgressStatus)} aria-label={label}>
      {PROGRESS_STATUSES.map((status) => <option key={status} value={status}>{PROGRESS_STATUS_LABELS[status]}</option>)}
    </select>
  </label>;
}
