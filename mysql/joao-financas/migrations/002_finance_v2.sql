-- Migration 002: finance v2 (Hostinger MySQL/MariaDB)
-- Prefer scripts/apply-migration.mjs which adds columns safely.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS financial_settings (
  user_id VARCHAR(36) NOT NULL,
  usd_rate_manual DECIMAL(12,4) NULL,
  active_income_scenario VARCHAR(10) NOT NULL DEFAULT 'avg',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
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

CREATE TABLE IF NOT EXISTS reserve_accounts (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Reserva de emergência',
  current_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  target_amount DECIMAL(14,2) NOT NULL DEFAULT 10000,
  safety_target DECIMAL(14,2) NOT NULL DEFAULT 1000,
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
