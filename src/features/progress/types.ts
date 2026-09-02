export const PROGRESS_STATUSES = [
  'not_started',
  'available',
  'in_progress',
  'prepared',
  'completable',
  'completed',
  'blocked',
] as const;

export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export type ProgressSnapshot = {
  version: 1;
  criteria: Record<string, ProgressStatus>;
  tasks: Record<string, ProgressStatus>;
  inventory: Record<string, number>;
};

export const EMPTY_PROGRESS_SNAPSHOT: ProgressSnapshot = {
  version: 1,
  criteria: {},
  tasks: {},
  inventory: {},
};

export interface ProgressRepository {
  loadSnapshot(): Promise<ProgressSnapshot>;
  saveCriterionStatus(criterionId: string, status: ProgressStatus): Promise<void>;
  saveMilestoneTaskStatus(taskId: string, status: ProgressStatus): Promise<void>;
  saveInventoryQuantity(entityId: string, quantity: number): Promise<void>;
  replaceSnapshot(snapshot: ProgressSnapshot): Promise<void>;
  saveMilestoneStatus(milestoneId: string, status: ProgressStatus): Promise<void>;
}

export interface ProgressBackup {
  load(): ProgressSnapshot | null;
  save(snapshot: ProgressSnapshot): void;
  clear(): void;
}

export function cloneProgressSnapshot(snapshot: ProgressSnapshot): ProgressSnapshot {
  return {
    version: 1,
    criteria: { ...snapshot.criteria },
    tasks: { ...snapshot.tasks },
    inventory: { ...snapshot.inventory },
  };
}
