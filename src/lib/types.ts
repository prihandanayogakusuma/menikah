export type MemberRole = "groom" | "bride" | "family" | "planner" | "partner";
export type ContributorType = "groom" | "bride" | "other";
export type ExpenseStatus = "unpaid" | "dp_paid" | "fully_paid";
export type SplitMode = "percent" | "nominal";
export type HealthStatus = "on_track" | "behind" | "achieved";

export interface Wedding {
  id: string;
  created_at: string;
  title: string;
  wedding_date: string;
  total_budget_target: number;
  groom_name: string | null;
  bride_name: string | null;
  created_by: string | null;
}

export interface WeddingMember {
  id: string;
  wedding_id: string;
  user_id: string;
  role: MemberRole;
  is_owner: boolean;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export interface WeddingInvitation {
  id: string;
  wedding_id: string;
  email: string;
  role: MemberRole;
  token: string;
  status: "pending" | "accepted" | "revoked";
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface SavingsGoal {
  id: string;
  wedding_id: string;
  groom_share_percent: number;
  bride_share_percent: number;
  split_mode: SplitMode;
  groom_target_amount: number;
  bride_target_amount: number;
  start_date: string;
  created_at: string;
}

export interface SavingsLog {
  id: string;
  wedding_id: string;
  contributor_type: ContributorType;
  amount: number;
  deposit_date: string;
  account_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  wedding_id: string;
  name: string;
  allocated_budget: number;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id: string;
  wedding_id: string;
  item_name: string;
  estimated_cost: number;
  actual_cost: number;
  dp_amount: number;
  status: ExpenseStatus;
  due_date: string | null;
  vendor_name: string | null;
  vendor_contact: string | null;
  contract_url: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}
