// Kept deliberately small in source control; regenerate from the linked Supabase project
// when schema changes (`supabase gen types typescript --linked`).
export type ProgressRow = {
  user_id: string;
  criterion_id: string | null;
  milestone_task_id: string | null;
  status: string;
  quantity: number | null;
};

export type InventoryRow = {
  user_id: string;
  entity_id: string;
  quantity: number;
};

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
};
