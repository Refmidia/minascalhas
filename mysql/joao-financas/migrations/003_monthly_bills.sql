-- Migration 003: monthly bills + unified payments (safe, additive)
SET NAMES utf8mb4;

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
