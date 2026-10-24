export type Currency = "BRL" | "USD";
export type IncomeScenario = "min" | "avg" | "max";

export type Income = {
  id: string;
  user_id: string;
  description: string;
  amount: number | string;
  category: string | null;
  source: string | null;
  client_name: string | null;
  payment_method: string | null;
  recurrence: string;
  status: string;
  expected_at: string | null;
  received_at: string;
  is_recurring: number | boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  description: string;
  amount: number | string;
  category: string;
  payment_method: string | null;
  spent_at: string;
  is_recurring: number | boolean;
  is_essential: number | boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Debt = {
  id: string;
  user_id: string;
  creditor: string;
  category: string;
  currency: Currency | string;
  total_amount: number | string;
  paid_amount: number | string;
  original_amount: number | string | null;
  installments_total: number | null;
  installments_paid: number;
  installment_amount: number | string | null;
  interest_rate: number | string | null;
  contracted_at: string | null;
  due_date: string | null;
  due_day: number | null;
  status: string;
  priority: string;
  payment_type: string | null;
  amount_meaning: string | null;
  needs_review: number | boolean;
  monthly_commitment: number | string | null;
  notes: string | null;
  archived_at: string | null;
  paid_off_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number | string;
  current_amount: number | string;
  deadline: string | null;
  icon: string | null;
  kind: string;
  monthly_contribution: number | string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringAccount = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount: number | string;
  currency: string;
  frequency: string;
  due_day: number | null;
  priority: string;
  status: string;
  payment_method: string | null;
  notes: string | null;
  auto_generate: number | boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReserveAccount = {
  id: string;
  user_id: string;
  name: string;
  current_amount: number | string;
  target_amount: number | string;
  safety_target: number | string;
  created_at: string;
  updated_at: string;
};

export type ReserveTransaction = {
  id: string;
  user_id: string;
  reserve_id: string;
  type: "deposit" | "withdraw" | string;
  amount: number | string;
  reason: string | null;
  occurred_at: string;
  attachment_url: string | null;
  created_at: string;
};

export type DebtPayment = {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number | string;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type DebtInstallment = {
  id: string;
  user_id: string;
  debt_id: string;
  installment_number: number;
  amount: number | string;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  notes: string | null;
};

export type FinancialProfile = {
  id: string;
  display_name: string | null;
  income_type: string | null;
  income_min: number | string | null;
  income_avg: number | string | null;
  income_max: number | string | null;
  saved_amount: number | string | null;
  situation_note: string | null;
};

export type FinancialSettings = {
  user_id: string;
  usd_rate_manual: number | string | null;
  active_income_scenario: IncomeScenario | string;
};

export type CalendarEvent = {
  id: string;
  kind: "debt" | "recurring" | "income" | "installment" | "payment";
  title: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  priority: string;
  category: string;
  debtId?: string;
  accountId?: string;
  billId?: string;
};

export type HealthReport = {
  score: number;
  label: string;
  reasons: string[];
  positives: string[];
  risks: string[];
  actions: string[];
};
