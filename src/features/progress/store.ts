import {
  EMPTY_PROGRESS_SNAPSHOT,
  cloneProgressSnapshot,
  type ProgressBackup,
  type ProgressRepository,
  type ProgressSnapshot,
  type ProgressStatus,
} from './types.ts';

export class CanonicalProgressStore {
  private snapshot: ProgressSnapshot;
  private listeners = new Set<() => void>();
  private readonly repository: ProgressRepository;
  private readonly backup: ProgressBackup;

  constructor(
    repository: ProgressRepository,
    backup: ProgressBackup,
    initialSnapshot: ProgressSnapshot = EMPTY_PROGRESS_SNAPSHOT,
  ) {
    this.repository = repository;
    this.backup = backup;
    this.snapshot = cloneProgressSnapshot(initialSnapshot);
  }

  getSnapshot = (): ProgressSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(next: ProgressSnapshot) {
    this.snapshot = next;
    this.backup.save(next);
    for (const listener of this.listeners) listener();
  }

  async hydrate(): Promise<ProgressSnapshot> {
    const local = this.backup.load();
    if (local) this.publish(cloneProgressSnapshot(local));
    try {
      const remote = await this.repository.loadSnapshot();
      this.publish(cloneProgressSnapshot(remote));
      return this.snapshot;
    } catch (error) {
      if (local) return this.snapshot;
      throw error;
    }
  }

  async setCriterionStatus(criterionId: string, status: ProgressStatus): Promise<void> {
    const previous = this.snapshot.criteria[criterionId];
    const next = cloneProgressSnapshot(this.snapshot);
    next.criteria[criterionId] = status;
    this.publish(next);
    try {
      await this.repository.saveCriterionStatus(criterionId, status);
    } catch (error) {
      const rollback = cloneProgressSnapshot(this.snapshot);
      if (previous === undefined) delete rollback.criteria[criterionId];
      else rollback.criteria[criterionId] = previous;
      this.publish(rollback);
      throw error;
    }
  }

  async setMilestoneTaskStatus(taskId: string, status: ProgressStatus): Promise<void> {
    const previous = this.snapshot.tasks[taskId];
    const next = cloneProgressSnapshot(this.snapshot);
    next.tasks[taskId] = status;
    this.publish(next);
    try {
      await this.repository.saveMilestoneTaskStatus(taskId, status);
    } catch (error) {
      const rollback = cloneProgressSnapshot(this.snapshot);
      if (previous === undefined) delete rollback.tasks[taskId];
      else rollback.tasks[taskId] = previous;
      this.publish(rollback);
      throw error;
    }
  }

  async setInventoryQuantity(entityId: string, quantity: number): Promise<void> {
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error('La cantidad debe ser un número mayor o igual que cero');
    const previous = this.snapshot.inventory[entityId];
    const next = cloneProgressSnapshot(this.snapshot);
    next.inventory[entityId] = quantity;
    this.publish(next);
    try {
      await this.repository.saveInventoryQuantity(entityId, quantity);
    } catch (error) {
      const rollback = cloneProgressSnapshot(this.snapshot);
      if (previous === undefined) delete rollback.inventory[entityId];
      else rollback.inventory[entityId] = previous;
      this.publish(rollback);
      throw error;
    }
  }

  async setMilestoneStatus(
    milestoneId: string,
    criterionIds: string[],
    taskIds: string[],
    status: ProgressStatus,
  ): Promise<void> {
    const previous = cloneProgressSnapshot(this.snapshot);
    const next = cloneProgressSnapshot(this.snapshot);
    for (const criterionId of new Set(criterionIds)) next.criteria[criterionId] = status;
    for (const taskId of new Set(taskIds)) next.tasks[taskId] = status;
    this.publish(next);
    try {
      await this.repository.saveMilestoneStatus(milestoneId, status);
    } catch (error) {
      this.publish(previous);
      throw error;
    }
  }

  async importSnapshot(snapshot: ProgressSnapshot): Promise<void> {
    const previous = cloneProgressSnapshot(this.snapshot);
    this.publish(cloneProgressSnapshot(snapshot));
    try {
      await this.repository.replaceSnapshot(snapshot);
    } catch (error) {
      this.publish(previous);
      throw error;
    }
  }

  replaceSnapshot(snapshot: ProgressSnapshot) {
    this.publish(cloneProgressSnapshot(snapshot));
  }
}
