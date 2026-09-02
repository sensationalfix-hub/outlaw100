import { PROGRESS_STATUSES, type ProgressRepository, type ProgressSnapshot, type ProgressStatus } from './types.ts';

type QueryError = { message?: string } | null;
type QueryResult<T> = { data: T; error: QueryError };

type SupabaseLike = {
  from(table: string): any;
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult<unknown>>;
};

type ProgressRow = {
  id: string;
  criterion_id: string | null;
  milestone_task_id: string | null;
  status: string;
};

type InventoryRow = {
  entity_id: string;
  quantity: number | string;
};

const validStatuses = new Set<string>(PROGRESS_STATUSES);

function assertNoError(error: QueryError, context: string) {
  if (error) throw new Error(error.message || context);
}

function asStatus(value: string): ProgressStatus | null {
  return validStatuses.has(value) ? value as ProgressStatus : null;
}

const PAGE_SIZE = 1000;

async function readUserRows<T>(
  client: SupabaseLike,
  table: string,
  columns: string,
  userId: string,
  orderColumn: string,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const result = await client
      .from(table)
      .select(columns)
      .eq('user_id', userId)
      .order(orderColumn)
      .range(offset, offset + PAGE_SIZE - 1) as QueryResult<T[] | null>;

    assertNoError(result.error, `No se pudieron cargar filas de ${table}`);
    const batch = result.data ?? [];
    if (batch.length === 0) break;

    rows.push(...batch);
    offset += batch.length;
  }

  return rows;
}

export function createSupabaseProgressRepository(client: SupabaseLike, userId: string): ProgressRepository {
  return {
    async loadSnapshot(): Promise<ProgressSnapshot> {
      const [progressRows, inventoryRows] = await Promise.all([
        readUserRows<ProgressRow>(client, 'progress', 'id,criterion_id,milestone_task_id,status', userId, 'id'),
        readUserRows<InventoryRow>(client, 'inventory', 'entity_id,quantity', userId, 'entity_id'),
      ]);

      const snapshot: ProgressSnapshot = { version: 1, criteria: {}, tasks: {}, inventory: {} };
      for (const row of progressRows) {
        const status = asStatus(row.status);
        if (!status) continue;
        if (row.criterion_id) snapshot.criteria[row.criterion_id] = status;
        if (row.milestone_task_id) snapshot.tasks[row.milestone_task_id] = status;
      }
      for (const row of inventoryRows) {
        const quantity = Number(row.quantity);
        if (Number.isFinite(quantity) && quantity >= 0) snapshot.inventory[row.entity_id] = quantity;
      }
      return snapshot;
    },

    async saveCriterionStatus(criterionId: string, status: ProgressStatus) {
      const { error } = await client.rpc('set_criterion_progress', {
        p_criterion_id: criterionId,
        p_status: status,
      });
      assertNoError(error, 'No se pudo guardar el criterio');
    },

    async saveMilestoneTaskStatus(taskId: string, status: ProgressStatus) {
      const { error } = await client.rpc('set_milestone_task_progress', {
        p_task_id: taskId,
        p_status: status,
      });
      assertNoError(error, 'No se pudo guardar la tarea');
    },

    async saveInventoryQuantity(entityId: string, quantity: number) {
      const { error } = await client.from('inventory').upsert(
        { user_id: userId, entity_id: entityId, quantity },
        { onConflict: 'user_id,entity_id' },
      );
      assertNoError(error, 'No se pudo guardar el inventario');
    },


    async replaceSnapshot(snapshot: ProgressSnapshot) {
      const { error } = await client.rpc('replace_user_progress', { p_snapshot: snapshot });
      assertNoError(error, 'No se pudo importar el progreso');
    },


    async saveMilestoneStatus(milestoneId: string, status: ProgressStatus) {
      const { error } = await client.rpc('set_milestone_progress', {
        p_milestone_id: milestoneId,
        p_status: status,
      });
      assertNoError(error, 'No se pudo guardar el hito completo');
    },
  };
}
