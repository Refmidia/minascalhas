/** DDL embutido — funciona na Vercel sem ler arquivos do disco. */
export const JOAO_FINANCAS_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email),
  UNIQUE KEY users_username_uq (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) NOT NULL,
  display_name VARCHAR(255) NULL,
  income_type VARCHAR(50) NULL,
  income_min DECIMAL(14,2) NULL,
  income_avg DECIMAL(14,2) NULL,
  income_max DECIMAL(14,2) NULL,
  saved_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  situation_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_settings (
  user_id VARCHAR(36) NOT NULL,
  usd_rate_manual DECIMAL(12,4) NULL,
  active_income_scenario VARCHAR(10) NOT NULL DEFAULT 'avg',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incomes (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  category VARCHAR(100) NULL,
  source VARCHAR(255) NULL,
  client_name VARCHAR(255) NULL,
  payment_method VARCHAR(100) NULL,
  recurrence VARCHAR(50) NOT NULL DEFAULT 'unique',
  status VARCHAR(30) NOT NULL DEFAULT 'recebida',
  expected_at DATE NULL,
  received_at DATE NOT NULL,
  is_recurring TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY incomes_user_date_idx (user_id, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'outros',
  payment_method VARCHAR(100) NULL,
  spent_at DATE NOT NULL,
  is_recurring TINYINT(1) NOT NULL DEFAULT 0,
  is_essential TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'ativa',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY expenses_user_date_idx (user_id, spent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recurring_accounts (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'outros',
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  frequency VARCHAR(30) NOT NULL DEFAULT 'mensal',
  due_day INT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'media',
  status VARCHAR(30) NOT NULL DEFAULT 'ativa',
  payment_method VARCHAR(100) NULL,
  notes TEXT NULL,
  auto_generate TINYINT(1) NOT NULL DEFAULT 1,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY recurring_user_idx (user_id, status),
  UNIQUE KEY recurring_user_name_uq (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recurring_ledger (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  paid_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY recurring_ledger_uq (account_id, period_key),
  KEY recurring_ledger_user_due (user_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS debts (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  creditor VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'outros',
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  total_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  original_amount DECIMAL(14,2) NULL,
  installments_total INT NULL,
  installments_paid INT NOT NULL DEFAULT 0,
  installment_amount DECIMAL(14,2) NULL,
  interest_rate DECIMAL(6,3) NULL,
  contracted_at DATE NULL,
  due_date DATE NULL,
  due_day INT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'em_dia',
  priority VARCHAR(30) NOT NULL DEFAULT 'media',
  payment_type VARCHAR(50) NULL,
  amount_meaning VARCHAR(40) NULL,
  needs_review TINYINT(1) NOT NULL DEFAULT 0,
  monthly_commitment DECIMAL(14,2) NULL,
  notes TEXT NULL,
  archived_at TIMESTAMP NULL,
  paid_off_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY debts_user_due_idx (user_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS debt_payments (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  debt_id VARCHAR(36) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  paid_at DATE NOT NULL,
  notes TEXT NULL,
  idempotency_key VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY debt_payments_debt_idx (debt_id, paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS debt_installments (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  debt_id VARCHAR(36) NOT NULL,
  installment_number INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  due_date DATE NULL,
  paid_at DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY debt_inst_uq (debt_id, installment_number),
  KEY debt_inst_user_due (user_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  target_amount DECIMAL(14,2) NOT NULL,
  current_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  deadline DATE NULL,
  icon VARCHAR(100) NULL,
  kind VARCHAR(40) NOT NULL DEFAULT 'custom',
  monthly_contribution DECIMAL(14,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY goals_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goal_transactions (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  goal_id VARCHAR(36) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  notes TEXT NULL,
  occurred_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY goal_tx_goal (goal_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserve_accounts (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Reserva de emergência',
  current_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  target_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  safety_target DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY reserve_user_uq (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserve_transactions (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  reserve_id VARCHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reason VARCHAR(255) NULL,
  occurred_at DATE NOT NULL,
  attachment_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY reserve_tx_user (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  url_or_path TEXT NOT NULL,
  mime VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY attachments_entity (user_id, entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  kind VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY categories_uq (user_id, kind, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_bills (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  source_id VARCHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Outros',
  group_key VARCHAR(40) NOT NULL DEFAULT 'outros',
  reference_month CHAR(7) NOT NULL,
  due_date DATE NOT NULL,
  expected_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY monthly_bills_uq (user_id, source_type, source_id, reference_month),
  KEY monthly_bills_month_idx (user_id, reference_month, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  monthly_bill_id VARCHAR(36) NULL,
  debt_id VARCHAR(36) NULL,
  installment_id VARCHAR(36) NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NULL,
  account_used VARCHAR(100) NULL,
  notes TEXT NULL,
  attachment_url TEXT NULL,
  is_full TINYINT(1) NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY payments_idem_uq (user_id, idempotency_key),
  KEY payments_bill_idx (monthly_bill_id),
  KEY payments_debt_idx (debt_id),
  KEY payments_user_date (user_id, payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budget_splits (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  bundle_key VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY budget_splits_uq (user_id, bundle_key, item_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS households (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Nossa casa',
  invite_code VARCHAR(12) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY households_invite_uq (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS household_members (
  household_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY household_members_household_idx (household_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
