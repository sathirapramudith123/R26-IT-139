-- =============================================================================
--  LANKA-LINK — COMPLETE DATABASE SETUP (one file)
--  = sql/schema.sql + sql/atomic_banking.sql + token revocation + sql/dummy_bank.sql
--  Generated — edit the source files, not this one.
-- -----------------------------------------------------------------------------
--  How to run: Supabase -> SQL Editor -> paste the whole file -> Run.
--
--  Safe on a NEW database (creates everything) and on the EXISTING one:
--   * tables / types / indexes use IF NOT EXISTS, columns use ADD COLUMN IF NOT EXISTS
--   * functions use CREATE OR REPLACE
--   * nothing drops a table, a column or a type, and no rows are deleted
--     (the only UPDATE fills received_at where it is NULL)
--
--  Before running on the LIVE database: backend/.env SUPABASE_KEY must be the
--  service_role key (the ROW LEVEL SECURITY lines block every other key).
-- =============================================================================

-- =============================================================================
--  PART 1 — TABLES, TYPES, INDEXES, COLUMNS  (sql/schema.sql)
-- =============================================================================

-- ============================================================================
--  SMART MERCHANT SUPPORT PLATFORM FOR AGENCY BANKING AND PROCUREMENT
--  Complete schema with automatic stock movement
-- ============================================================================

SET search_path TO public;

-- ============================================================================
--  ENUMS
-- ============================================================================

DO $$ BEGIN CREATE TYPE transaction_type_enum           AS ENUM ('SALE', 'PURCHASE', 'EXPENSE', 'DEPOSIT', 'TRANSFER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method_enum             AS ENUM ('CASH', 'BANK', 'DIGITAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inventory_unit_enum             AS ENUM ('KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'CARTON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inventory_status_enum           AS ENUM ('AVAILABLE', 'RUNNING_OUT', 'OUT_OF_STOCK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_status_enum            AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE procurement_status_enum         AS ENUM ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE banking_transaction_type_enum   AS ENUM ('CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'FUND_TRANSFER', 'BALANCE_INQUIRY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE banking_status_enum             AS ENUM ('COMPLETED', 'PENDING', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type_enum          AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ALERT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_category_enum      AS ENUM ('INVENTORY', 'BANKING', 'PROCUREMENT', 'TRANSACTION', 'SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sync_operation_enum             AS ENUM ('CREATE', 'UPDATE', 'DELETE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sync_status_enum                AS ENUM ('QUEUED', 'SYNCED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
--  TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_code          VARCHAR(20)  NOT NULL DEFAULT ('MER-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),

    full_name          VARCHAR(150) NOT NULL,
    email              VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,

    reset_token        VARCHAR(255),
    reset_token_expiry TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,
    token_version      INTEGER      NOT NULL DEFAULT 0,  -- +1 = revoke all JWTs (password change, sign out everywhere)

    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_user_code       UNIQUE (user_code),
    CONSTRAINT chk_user_code_not_blank  CHECK (LENGTH(TRIM(user_code)) > 0),
    CONSTRAINT chk_user_name_not_blank  CHECK (LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT chk_user_email_not_blank CHECK (LENGTH(TRIM(email)) > 0)
);

-- ---------------------------------------------------------------------------
-- INVENTORY  (feeds ML Component 2 — demand forecasting)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id   UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(20)           NOT NULL DEFAULT ('INV-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id        UUID                  NOT NULL,

    item_name      VARCHAR(150)          NOT NULL,
    supplier_name  VARCHAR(150),
    quantity       NUMERIC(12,2)         NOT NULL DEFAULT 0,
    reorder_level  NUMERIC(12,2)         NOT NULL DEFAULT 0,
    unit           inventory_unit_enum   NOT NULL DEFAULT 'UNIT',
    unit_price     NUMERIC(12,2)         NOT NULL DEFAULT 0,
    item_status    inventory_status_enum NOT NULL DEFAULT 'AVAILABLE',

    created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_inventory_code UNIQUE (inventory_code),

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    -- REQUIRED by the stock engine: it matches items on (user_id, item_name)
    CONSTRAINT uq_inventory_user_item UNIQUE (user_id, item_name),

    CONSTRAINT chk_inventory_name_not_blank   CHECK (LENGTH(TRIM(item_name)) > 0),
    CONSTRAINT chk_inventory_qty_non_negative CHECK (quantity >= 0),
    CONSTRAINT chk_inventory_reorder_non_neg  CHECK (reorder_level >= 0),
    CONSTRAINT chk_inventory_price_non_neg    CHECK (unit_price >= 0)
);

-- ---------------------------------------------------------------------------
-- TRANSACTIONS  (feeds ML Component 1 — credit readiness)
-- A SALE carrying item_name + quantity automatically deducts stock.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id   UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(20)           NOT NULL DEFAULT ('TXN-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id          UUID                  NOT NULL,

    transaction_type transaction_type_enum NOT NULL,
    payment_method   payment_method_enum   NOT NULL,
    amount           NUMERIC(12,2)         NOT NULL,
    category         VARCHAR(100),
    description      TEXT,

    -- stock linkage (nullable: not every transaction moves stock)
    item_name        VARCHAR(150),
    quantity         NUMERIC(12,2),

    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_transaction_code UNIQUE (transaction_code),

    CONSTRAINT fk_transaction_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_txn_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_txn_qty_positive    CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT chk_txn_item_with_qty   CHECK (quantity IS NULL OR item_name IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- SUPPLIERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id        UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code      VARCHAR(20)          NOT NULL DEFAULT ('SUP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id            UUID                 NOT NULL,

    supplier_name      VARCHAR(150)         NOT NULL,
    company_name       VARCHAR(150),
    contact_number     VARCHAR(20)          NOT NULL,
    email              VARCHAR(255),
    address            TEXT,

    unit_price         NUMERIC(12,2)        NOT NULL DEFAULT 0,
    delivery_cost      NUMERIC(12,2)        NOT NULL DEFAULT 0,
    available_quantity NUMERIC(12,2)        NOT NULL DEFAULT 0,
    supplier_status    supplier_status_enum NOT NULL DEFAULT 'ACTIVE',

    created_at         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_supplier_code UNIQUE (supplier_code),

    CONSTRAINT fk_supplier_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_supplier_name_not_blank    CHECK (LENGTH(TRIM(supplier_name)) > 0),
    CONSTRAINT chk_supplier_contact_not_blank CHECK (LENGTH(TRIM(contact_number)) > 0),
    CONSTRAINT chk_supplier_price_non_neg     CHECK (unit_price >= 0),
    CONSTRAINT chk_supplier_delivery_non_neg  CHECK (delivery_cost >= 0),
    CONSTRAINT chk_supplier_avail_non_neg     CHECK (available_quantity >= 0)
);

-- ---------------------------------------------------------------------------
-- PROCUREMENT  (feeds ML Component 3 — buy now vs wait)
-- Status RECEIVED adds the quantity to inventory.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement (
    procurement_id         UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_code       VARCHAR(20)             NOT NULL DEFAULT ('PRC-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id                UUID                    NOT NULL,

    item_name              VARCHAR(150)            NOT NULL,
    quantity               NUMERIC(12,2)           NOT NULL,
    delivery_location      VARCHAR(150),
    expected_selling_price NUMERIC(12,2)           NOT NULL DEFAULT 0,
    selected_supplier_name VARCHAR(150),
    total_cost             NUMERIC(12,2)           NOT NULL DEFAULT 0,
    estimated_profit       NUMERIC(12,2)           NOT NULL DEFAULT 0,
    procurement_status     procurement_status_enum NOT NULL DEFAULT 'PENDING',

    created_at             TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_procurement_code UNIQUE (procurement_code),

    CONSTRAINT fk_procurement_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_prc_name_not_blank CHECK (LENGTH(TRIM(item_name)) > 0),
    CONSTRAINT chk_prc_qty_positive   CHECK (quantity > 0),
    CONSTRAINT chk_prc_price_non_neg  CHECK (expected_selling_price >= 0),
    CONSTRAINT chk_prc_cost_non_neg   CHECK (total_cost >= 0)
);

-- ---------------------------------------------------------------------------
-- AGENCY BANKING  (feeds ML Component 4 — anomaly detection)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agency_banking (
    agency_banking_id UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code    VARCHAR(20)                   NOT NULL DEFAULT ('AGB-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id           UUID                          NOT NULL,

    customer_name     VARCHAR(150)                  NOT NULL,
    customer_phone    VARCHAR(20)                   NOT NULL,
    transaction_type  banking_transaction_type_enum NOT NULL,
    amount            NUMERIC(12,2)                 NOT NULL,
    service_fee       NUMERIC(12,2)                 NOT NULL DEFAULT 0,
    commission        NUMERIC(12,2)                 NOT NULL DEFAULT 0,
    created_offline   BOOLEAN                       NOT NULL DEFAULT FALSE,
    banking_status    banking_status_enum           NOT NULL DEFAULT 'COMPLETED',

    created_at        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_agency_reference_code UNIQUE (reference_code),

    CONSTRAINT fk_agency_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_agb_customer_not_blank CHECK (LENGTH(TRIM(customer_name)) > 0),
    CONSTRAINT chk_agb_phone_not_blank    CHECK (LENGTH(TRIM(customer_phone)) > 0),
    CONSTRAINT chk_agb_amount_positive    CHECK (amount > 0),
    CONSTRAINT chk_agb_fee_non_neg        CHECK (service_fee >= 0),
    CONSTRAINT chk_agb_commission_non_neg CHECK (commission >= 0)
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id       UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID                       NOT NULL,

    title                 VARCHAR(150)               NOT NULL,
    message               TEXT                       NOT NULL,
    notification_type     notification_type_enum     NOT NULL DEFAULT 'INFO',
    notification_category notification_category_enum,
    is_read               BOOLEAN                    NOT NULL DEFAULT FALSE,
    link                  VARCHAR(255),

    read_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ                NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_ntf_title_not_blank   CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT chk_ntf_message_not_blank CHECK (LENGTH(TRIM(message)) > 0)
);

-- ---------------------------------------------------------------------------
-- SYNC QUEUE  (offline-first support)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_queue (
    sync_id     UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID                NOT NULL,

    module      VARCHAR(50)         NOT NULL,
    operation   sync_operation_enum NOT NULL,
    record_id   VARCHAR(100),
    payload     JSONB               NOT NULL DEFAULT '{}',
    sync_status sync_status_enum    NOT NULL DEFAULT 'QUEUED',
    error_note  TEXT,

    synced_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sync_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT chk_sync_module_not_blank CHECK (LENGTH(TRIM(module)) > 0)
);

-- ============================================================================
--  INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);

CREATE INDEX IF NOT EXISTS idx_txn_user  ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_code  ON transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_txn_type  ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_txn_item  ON transactions(user_id, item_name);

CREATE INDEX IF NOT EXISTS idx_inv_user      ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_code      ON inventory(inventory_code);
CREATE INDEX IF NOT EXISTS idx_inv_item_name ON inventory(user_id, item_name);
CREATE INDEX IF NOT EXISTS idx_inv_status    ON inventory(item_status);

-- partial: only items at or below the reorder level (drives low-stock alerts)
CREATE INDEX IF NOT EXISTS idx_inv_low_stock ON inventory(user_id) WHERE quantity <= reorder_level;

CREATE INDEX IF NOT EXISTS idx_sup_user ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_sup_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_sup_name ON suppliers(supplier_name);

CREATE INDEX IF NOT EXISTS idx_prc_user   ON procurement(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prc_code   ON procurement(procurement_code);
CREATE INDEX IF NOT EXISTS idx_prc_status ON procurement(procurement_status);

CREATE INDEX IF NOT EXISTS idx_agb_user ON agency_banking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agb_ref  ON agency_banking(reference_code);
CREATE INDEX IF NOT EXISTS idx_agb_type ON agency_banking(transaction_type);

CREATE INDEX IF NOT EXISTS idx_ntf_user ON notifications(user_id, created_at DESC);

-- partial: unread only (drives the notification bell badge)
CREATE INDEX IF NOT EXISTS idx_ntf_unread ON notifications(user_id) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_sync_user    ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_queue(user_id, created_at) WHERE sync_status = 'QUEUED';

-- ============================================================================
--  ROW LEVEL SECURITY
--  The backend uses the service_role key, which bypasses RLS.
--  RLS enabled with no policies = anon/authenticated keys are blocked entirely,
--  so the REST API is the only way into the data.
-- ============================================================================

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
--  COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS
'Core merchant identity record. One row per registered micro-merchant.';

COMMENT ON TABLE transactions IS
'All merchant money movement. A SALE carrying item_name and quantity automatically deducts that quantity from inventory. Aggregated features feed ML Component 1 (credit readiness).';

COMMENT ON TABLE inventory IS
'Stock items with reorder thresholds. Quantity moves automatically: down on sales, up on received procurement. Feeds ML Component 2 (demand forecasting).';

COMMENT ON TABLE suppliers IS
'Supplier register maintained by the merchant. Suppliers are data records, not platform user accounts.';

COMMENT ON TABLE procurement IS
'Procurement decisions. Marking a record RECEIVED adds its quantity to inventory; moving it away from RECEIVED reverses that. Feeds ML Component 3 (buy now vs wait).';

COMMENT ON TABLE agency_banking IS
'Banking transactions performed on behalf of customers. CBSL limits are enforced in the application layer. Feeds ML Component 4 (anomaly detection).';

COMMENT ON TABLE notifications IS
'In-app notifications: low stock, out of stock, stock received, and banking confirmations.';

COMMENT ON TABLE sync_queue IS
'Offline-first support. Operations made without connectivity are queued and replayed on reconnect.';

COMMENT ON COLUMN transactions.item_name IS
'Set on SALE transactions to identify which inventory item was sold. Matched against inventory(user_id, item_name).';

COMMENT ON COLUMN transactions.quantity IS
'Units sold. Deducted from the matching inventory item when the sale is recorded; reversed if the sale is edited or deleted.';

COMMENT ON COLUMN inventory.reorder_level IS
'Threshold at which the item counts as low. Crossing it raises a low-stock notification.';

COMMENT ON COLUMN inventory.item_status IS
'Maintained automatically by the stock engine: AVAILABLE, RUNNING_OUT when quantity <= reorder_level, OUT_OF_STOCK when quantity reaches 0.';

COMMENT ON COLUMN procurement.procurement_status IS
'Lifecycle of the decision. Moving to RECEIVED adds the quantity to inventory; moving away from RECEIVED reverses it.';



ALTER TABLE agency_banking 
  ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anomaly_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NOT NULL DEFAULT 'pos_terminal',
  ADD COLUMN IF NOT EXISTS tx_hour INT;


CREATE INDEX IF NOT EXISTS idx_agb_anomaly ON agency_banking(user_id, is_anomaly);


NOTIFY pgrst, 'reload schema';

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC DEFAULT 1;

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC DEFAULT 1;


ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(150);


CREATE INDEX IF NOT EXISTS idx_sup_delivery_location
  ON suppliers(user_id, delivery_location);


NOTIFY pgrst, 'reload schema';



ALTER TABLE inventory DROP CONSTRAINT IF EXISTS uq_inventory_user_item;

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS batch_no VARCHAR(24)
      DEFAULT ('BATCH-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_inv_fifo
  ON inventory(user_id, item_name, received_at);

UPDATE inventory SET received_at = created_at WHERE received_at IS NULL;

NOTIFY pgrst, 'reload schema';



DO $$ BEGIN
  CREATE TYPE kyc_tier_enum AS ENUM ('BASIC', 'VERIFIED', 'FULL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TABLE agency_banking
  ADD COLUMN IF NOT EXISTS kyc_tier kyc_tier_enum NOT NULL DEFAULT 'BASIC';

CREATE INDEX IF NOT EXISTS idx_agb_daily_sum
  ON agency_banking(user_id, customer_phone, transaction_type, created_at);

NOTIFY pgrst, 'reload schema';


ALTER TABLE procurement ALTER COLUMN item_name DROP NOT NULL;
ALTER TABLE procurement ALTER COLUMN quantity  DROP NOT NULL;


ALTER TABLE procurement
  ADD COLUMN IF NOT EXISTS items          JSONB,          
  ADD COLUMN IF NOT EXISTS procurement_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS order_date     DATE,
  ADD COLUMN IF NOT EXISTS arrival_date   DATE,
  ADD COLUMN IF NOT EXISTS special_note   TEXT,
  ADD COLUMN IF NOT EXISTS coords         JSONB;          

NOTIFY pgrst, 'reload schema';

-- ============================================================================
--  SYNC WITH APPLICATION CODE (2026-09-28)
--  Tables and columns the backend uses that were created directly in the
--  Supabase dashboard and were missing from this file.
--
--  Every statement is idempotent and non-destructive (IF NOT EXISTS, no DROP),
--  so this section is safe to run on the live database as well as on a fresh one.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- AGENT BANKS  (one float account per bank the agent works with)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_banks (
    agent_bank_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    bank_name       VARCHAR(100)  NOT NULL,
    bank_code       VARCHAR(20),
    risk_tier       VARCHAR(10)   NOT NULL DEFAULT 'LOW',

    float_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
    float_floor     NUMERIC(14,2) NOT NULL DEFAULT 50000,
    float_ceiling   NUMERIC(14,2) NOT NULL DEFAULT 500000,
    alert_low_pct   NUMERIC(5,2)  NOT NULL DEFAULT 40,
    alert_crit_pct  NUMERIC(5,2)  NOT NULL DEFAULT 20,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- the API returns "A bank with this name already exists." on this violation
    CONSTRAINT uq_agent_bank_user_name  UNIQUE (user_id, bank_name),
    CONSTRAINT chk_agent_bank_tier      CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_agent_bank_name      CHECK (LENGTH(TRIM(bank_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_agent_banks_user ON agent_banks(user_id);

-- ---------------------------------------------------------------------------
-- AGENT CASH POOL  (physical cash on hand, one row per agent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_cash_pool (
    pool_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

    cash_on_hand     NUMERIC(14,2) NOT NULL DEFAULT 0,
    reserve_floor    NUMERIC(14,2) NOT NULL DEFAULT 50000,
    day_start_cash   NUMERIC(14,2) NOT NULL DEFAULT 75000,
    last_reset_date  DATE,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- AGENCY BANKING — columns added after the table was created
-- ---------------------------------------------------------------------------
ALTER TABLE agency_banking
  ADD COLUMN IF NOT EXISTS customer_nic     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS account_number   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS source_of_funds  VARCHAR(150),
  ADD COLUMN IF NOT EXISTS agent_bank_id    UUID REFERENCES agent_banks(agent_bank_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS float_after      NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_agb_daily_nic
  ON agency_banking(user_id, customer_nic, transaction_type, created_at);

-- anomaly_score holds 0-100 (ML score / CBSL ratio %), but was declared NUMERIC(5,4)
-- (max 9.9999). Widen it only if it still has that old type — widening never loses data.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'agency_banking'
               AND column_name = 'anomaly_score'
               AND numeric_precision = 5 AND numeric_scale = 4) THEN
    ALTER TABLE agency_banking ALTER COLUMN anomaly_score TYPE NUMERIC(7,4);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- AGENT FLOAT LEDGER  (double-entry GL for every float / cash movement)
-- Rows are append-only: edits and deletes of a banking transaction add
-- *_REVERSAL rows instead of changing existing ones.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_float_ledger (
    ledger_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    agent_bank_id      UUID          REFERENCES agent_banks(agent_bank_id) ON DELETE CASCADE,
    -- SET NULL keeps the ledger history when a banking transaction is deleted
    agency_banking_id  UUID          REFERENCES agency_banking(agency_banking_id) ON DELETE SET NULL,

    journal_ref        UUID          NOT NULL,       -- both legs of one entry share this
    event_type         VARCHAR(30)   NOT NULL,       -- DEPOSIT, WITHDRAWAL, TOPUP, DEPOSIT_REVERSAL, WITHDRAWAL_REVERSAL
    gl_account         VARCHAR(50)   NOT NULL,       -- 'Agent Float' | 'Agent Cash-on-Hand'
    gl_direction       VARCHAR(2)    NOT NULL,
    amount             NUMERIC(14,2) NOT NULL,
    float_after        NUMERIC(14,2),
    note               TEXT,

    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_afl_direction CHECK (gl_direction IN ('DR', 'CR')),
    CONSTRAINT chk_afl_amount    CHECK (amount >= 0)
);

-- If any of the three agent tables already existed in a different shape (made by
-- hand in the dashboard), add whatever columns the code needs. Nullable/defaulted,
-- so this works even when the tables already hold rows.
ALTER TABLE agent_banks
  ADD COLUMN IF NOT EXISTS user_id         UUID,
  ADD COLUMN IF NOT EXISTS bank_name       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_code       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS risk_tier       VARCHAR(10)   DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS float_balance   NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS float_floor     NUMERIC(14,2) DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS float_ceiling   NUMERIC(14,2) DEFAULT 500000,
  ADD COLUMN IF NOT EXISTS alert_low_pct   NUMERIC(5,2)  DEFAULT 40,
  ADD COLUMN IF NOT EXISTS alert_crit_pct  NUMERIC(5,2)  DEFAULT 20,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ   DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ   DEFAULT NOW();

ALTER TABLE agent_cash_pool
  ADD COLUMN IF NOT EXISTS user_id          UUID,
  ADD COLUMN IF NOT EXISTS cash_on_hand     NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserve_floor    NUMERIC(14,2) DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS day_start_cash   NUMERIC(14,2) DEFAULT 75000,
  ADD COLUMN IF NOT EXISTS last_reset_date  DATE,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ   DEFAULT NOW();

ALTER TABLE agent_float_ledger
  ADD COLUMN IF NOT EXISTS user_id            UUID,
  ADD COLUMN IF NOT EXISTS agent_bank_id      UUID,
  ADD COLUMN IF NOT EXISTS agency_banking_id  UUID,
  ADD COLUMN IF NOT EXISTS journal_ref        UUID,
  ADD COLUMN IF NOT EXISTS event_type         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS gl_account         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gl_direction       VARCHAR(2),
  ADD COLUMN IF NOT EXISTS amount             NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS float_after        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS note               TEXT,
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ DEFAULT NOW();

-- Reversal events (edit / delete of a banking transaction). If event_type was
-- created as an ENUM, add the two values; if it is text, nothing to do.
DO $$
DECLARE enum_name text;
BEGIN
  SELECT c.udt_name INTO enum_name
  FROM information_schema.columns c
  JOIN pg_type t ON t.typname = c.udt_name AND t.typtype = 'e'
  WHERE c.table_schema = 'public' AND c.table_name = 'agent_float_ledger' AND c.column_name = 'event_type';
  IF enum_name IS NOT NULL THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_name, 'DEPOSIT_REVERSAL');
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_name, 'WITHDRAWAL_REVERSAL');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_afl_user_bank ON agent_float_ledger(user_id, agent_bank_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afl_journal   ON agent_float_ledger(journal_ref);

-- ---------------------------------------------------------------------------
-- TRANSACTIONS / SUPPLIERS / PROCUREMENT — JSONB and map columns
-- ---------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS items JSONB;                 -- cart lines [{item_name, quantity, unit_price, cost_price}]

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS items_supplied JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{item_name, quantity, unit_price}]
  ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION;

ALTER TABLE procurement
  ADD COLUMN IF NOT EXISTS recommended_suppliers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY for the new tables
-- The tables above use RLS with no policies (only the service_role key used by
-- the backend can reach them). Before running these lines on the LIVE database,
-- confirm backend/.env SUPABASE_KEY is the service_role key — with the anon key
-- the API would lose access to these tables.
-- ---------------------------------------------------------------------------
ALTER TABLE agent_banks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cash_pool    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_float_ledger ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE agent_banks IS
'Float account per partner bank. float_balance changes only through top-ups and agency banking transactions, each with a ledger entry.';
COMMENT ON TABLE agent_cash_pool IS
'Agent physical cash on hand (one row per agent), shared across all banks.';
COMMENT ON TABLE agent_float_ledger IS
'Append-only double-entry ledger of float and cash movements. Corrections are added as *_REVERSAL rows.';

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  PART 2 — ATOMIC BANKING FUNCTIONS  (sql/atomic_banking.sql)
-- =============================================================================

-- =============================================================================
-- Agency banking: atomic float / cash-pool operations (#13 A)
-- -----------------------------------------------------------------------------
-- Run this once in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- It only CREATES FUNCTIONS. No table is changed and no data is touched or deleted.
-- (Undo: DROP FUNCTION for each function below.)
--
-- Why: supabase-js cannot run a DB transaction, so a banking entry used to be
-- 4-5 separate requests (insert, ledger, bank float, cash pool). Two requests at the
-- same moment could both read the same balance (lost update), and an error half-way
-- left the ledger and the balances out of step. Each function below runs as ONE
-- transaction: everything is saved, or (on any error) nothing is.
-- The user's cash-pool row is locked first (SELECT ... FOR UPDATE), so banking
-- operations of the same user run one after the other.
--
-- Business rejections are raised as exceptions whose MESSAGE is a code
-- (INSUFFICIENT_FLOAT, DAILY_LIMIT, ...) and whose DETAIL is JSON with the numbers;
-- the backend (src/utils/float.js -> bankingError) turns them into the user message.
-- =============================================================================

-- Lock (and create / daily-reset) the user's cash pool. p_today is the Sri Lanka date.
CREATE OR REPLACE FUNCTION _agent_pool_lock(
  p_user uuid, p_today date, p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS agent_cash_pool
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v agent_cash_pool;
BEGIN
  INSERT INTO agent_cash_pool (user_id, cash_on_hand, reserve_floor, day_start_cash, last_reset_date)
  VALUES (p_user, p_start_cash, p_reserve, p_start_cash, p_today)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v FROM agent_cash_pool WHERE user_id = p_user FOR UPDATE;

  -- new day -> cash on hand back to the day's starting cash (same rule as before)
  IF v.last_reset_date IS NULL OR v.last_reset_date < p_today THEN
    UPDATE agent_cash_pool
       SET cash_on_hand = COALESCE(NULLIF(day_start_cash, 0), p_start_cash),
           last_reset_date = p_today, updated_at = now()
     WHERE user_id = p_user
    RETURNING * INTO v;
  END IF;
  RETURN v;
END $$;

-- Move money between a bank's float and the cash pool + write both GL legs.
-- The caller must already hold the locks on the pool and the bank.
--   DEPOSIT              float -amt, cash +amt
--   WITHDRAWAL           float +amt, cash -amt
--   TOPUP                float +amt, cash -amt
--   DEPOSIT_REVERSAL     float +amt, cash -amt
--   WITHDRAWAL_REVERSAL  float -amt, cash +amt
-- Ledger rows and GL directions are exactly the ones the old JS code wrote.
CREATE OR REPLACE FUNCTION _float_move(
  p_user uuid, p_bank agent_banks, p_kind text, p_amount numeric,
  p_agb uuid DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_float numeric := p_bank.float_balance;
  v_cash  numeric;
  v_ref   uuid := gen_random_uuid();
  v_float_dir text; v_cash_dir text; v_float_first boolean;
BEGIN
  SELECT cash_on_hand INTO v_cash FROM agent_cash_pool WHERE user_id = p_user;

  IF p_kind = 'DEPOSIT' THEN
    IF v_float - p_amount < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_FLOAT' USING DETAIL = json_build_object('float', v_float)::text;
    END IF;
    v_float := v_float - p_amount; v_cash := v_cash + p_amount;
    v_float_dir := 'DR'; v_cash_dir := 'CR'; v_float_first := true;
  ELSIF p_kind = 'WITHDRAWAL' THEN
    IF v_cash - p_amount < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_CASH' USING DETAIL = json_build_object('cash', v_cash)::text;
    END IF;
    v_float := v_float + p_amount; v_cash := v_cash - p_amount;
    v_float_dir := 'CR'; v_cash_dir := 'DR'; v_float_first := false;
  ELSIF p_kind = 'TOPUP' THEN
    v_float := v_float + p_amount; v_cash := v_cash - p_amount;
    v_float_dir := 'DR'; v_cash_dir := 'CR'; v_float_first := true;
  ELSIF p_kind = 'DEPOSIT_REVERSAL' THEN
    IF v_cash - p_amount < 0 THEN
      RAISE EXCEPTION 'CANNOT_UNDO_DEPOSIT'
        USING DETAIL = json_build_object('cash', v_cash, 'amount', p_amount)::text;
    END IF;
    v_float := v_float + p_amount; v_cash := v_cash - p_amount;
    v_float_dir := 'CR'; v_cash_dir := 'DR'; v_float_first := true;
  ELSIF p_kind = 'WITHDRAWAL_REVERSAL' THEN
    IF v_float - p_amount < 0 THEN
      RAISE EXCEPTION 'CANNOT_UNDO_WITHDRAWAL'
        USING DETAIL = json_build_object('float', v_float, 'amount', p_amount,
                                         'bank_name', p_bank.bank_name)::text;
    END IF;
    v_float := v_float - p_amount; v_cash := v_cash + p_amount;
    v_float_dir := 'DR'; v_cash_dir := 'CR'; v_float_first := false;
  ELSE
    -- FUND_TRANSFER / BALANCE_INQUIRY: no float movement
    RETURN jsonb_build_object('float_after', v_float, 'cash_after', v_cash, 'moved', false);
  END IF;

  IF v_float_first THEN
    INSERT INTO agent_float_ledger (user_id, agent_bank_id, agency_banking_id, journal_ref, event_type,
                                    gl_account, gl_direction, amount, float_after, note)
    VALUES (p_user, p_bank.agent_bank_id, p_agb, v_ref, p_kind, 'Agent Float',        v_float_dir, p_amount, v_float, p_note),
           (p_user, p_bank.agent_bank_id, p_agb, v_ref, p_kind, 'Agent Cash-on-Hand', v_cash_dir,  p_amount, NULL,    p_note);
  ELSE
    INSERT INTO agent_float_ledger (user_id, agent_bank_id, agency_banking_id, journal_ref, event_type,
                                    gl_account, gl_direction, amount, float_after, note)
    VALUES (p_user, p_bank.agent_bank_id, p_agb, v_ref, p_kind, 'Agent Cash-on-Hand', v_cash_dir,  p_amount, NULL,    p_note),
           (p_user, p_bank.agent_bank_id, p_agb, v_ref, p_kind, 'Agent Float',        v_float_dir, p_amount, v_float, p_note);
  END IF;

  UPDATE agent_banks SET float_balance = v_float, updated_at = now()
   WHERE agent_bank_id = p_bank.agent_bank_id AND user_id = p_user;
  UPDATE agent_cash_pool SET cash_on_hand = v_cash, updated_at = now()
   WHERE user_id = p_user;

  RETURN jsonb_build_object('float_after', v_float, 'cash_after', v_cash, 'moved', true);
END $$;

-- CBSL daily limits for one customer (checked while the pool lock is held, so two
-- requests for the same customer cannot both slip under the limit).
CREATE OR REPLACE FUNCTION _banking_limits(
  p_user uuid, p_row jsonb, p_day_start timestamptz, p_limit numeric, p_max_txns int,
  p_exclude uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_type   text    := p_row->>'transaction_type';
  v_amount numeric := (p_row->>'amount')::numeric;
  v_nic    text    := NULLIF(btrim(COALESCE(p_row->>'customer_nic', '')), '');
  v_already numeric; v_count int;
BEGIN
  IF p_limit IS NOT NULL THEN
    IF v_amount > p_limit THEN
      RAISE EXCEPTION 'PER_TXN_LIMIT' USING DETAIL = json_build_object('limit', p_limit)::text;
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO v_already
      FROM agency_banking
     WHERE user_id = p_user AND customer_phone = p_row->>'customer_phone'
       AND transaction_type::text = v_type AND created_at >= p_day_start
       AND (p_exclude IS NULL OR agency_banking_id <> p_exclude);
    IF v_already + v_amount > p_limit THEN
      RAISE EXCEPTION 'DAILY_LIMIT'
        USING DETAIL = json_build_object('limit', p_limit, 'already', v_already)::text;
    END IF;
  END IF;

  IF p_max_txns IS NOT NULL AND v_nic IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
      FROM agency_banking
     WHERE user_id = p_user AND customer_nic = v_nic
       AND transaction_type::text = v_type AND created_at >= p_day_start
       AND (p_exclude IS NULL OR agency_banking_id <> p_exclude);
    IF v_count >= p_max_txns THEN
      RAISE EXCEPTION 'MAX_TXNS' USING DETAIL = json_build_object('max', p_max_txns)::text;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION _banking_kind(p_type text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_type LIKE '%DEPOSIT%' THEN 'DEPOSIT'
              WHEN p_type LIKE '%WITHDRAWAL%' THEN 'WITHDRAWAL'
              ELSE 'NONE' END
$$;

-- ── POST /agency-banking ─────────────────────────────────────────────────────
-- p_row: the columns from agencyBanking.controller.js toDb() + is_anomaly, anomaly_score
CREATE OR REPLACE FUNCTION banking_post(
  p_user uuid, p_row jsonb, p_today date, p_day_start timestamptz,
  p_limit numeric DEFAULT NULL, p_max_txns int DEFAULT NULL,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_pool agent_cash_pool; v_bank agent_banks; r agency_banking; v_row agency_banking;
  v_move jsonb := NULL;
BEGIN
  v_pool := _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
  PERFORM _banking_limits(p_user, p_row, p_day_start, p_limit, p_max_txns);

  r := jsonb_populate_record(NULL::agency_banking, p_row);
  IF r.agent_bank_id IS NOT NULL THEN
    SELECT * INTO v_bank FROM agent_banks
     WHERE agent_bank_id = r.agent_bank_id AND user_id = p_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BANK_NOT_FOUND'; END IF;
  END IF;

  INSERT INTO agency_banking (
    user_id, customer_name, customer_phone, customer_nic, account_number, source_of_funds,
    transaction_type, agent_bank_id, amount, service_fee, commission, channel, tx_hour,
    created_offline, banking_status, is_anomaly, anomaly_score)
  VALUES (
    p_user, r.customer_name, r.customer_phone, r.customer_nic, r.account_number, r.source_of_funds,
    r.transaction_type, r.agent_bank_id, r.amount, COALESCE(r.service_fee, 0), COALESCE(r.commission, 0),
    COALESCE(r.channel, 'pos_terminal'), r.tx_hour, COALESCE(r.created_offline, false),
    COALESCE(r.banking_status, 'COMPLETED'), COALESCE(r.is_anomaly, false), COALESCE(r.anomaly_score, 0))
  RETURNING * INTO v_row;

  IF v_bank.agent_bank_id IS NOT NULL THEN
    v_move := _float_move(p_user, v_bank, _banking_kind(v_row.transaction_type::text), v_row.amount,
                          v_row.agency_banking_id, NULL);
    UPDATE agency_banking SET float_after = (v_move->>'float_after')::numeric
     WHERE agency_banking_id = v_row.agency_banking_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'row', to_jsonb(v_row),
    'float_after', v_move->'float_after',
    'cash_after',  v_move->'cash_after',
    'bank_before', CASE WHEN v_bank.agent_bank_id IS NULL THEN NULL ELSE to_jsonb(v_bank) END,
    'pool_before', to_jsonb(v_pool));
END $$;

-- ── PUT /agency-banking/:id ──────────────────────────────────────────────────
-- Same rules as before: only a record whose float was applied is re-balanced, and
-- only when bank / amount / type changed (reversal of the old entry + new movement).
CREATE OR REPLACE FUNCTION banking_update(
  p_user uuid, p_id uuid, p_row jsonb, p_today date, p_day_start timestamptz,
  p_limit numeric DEFAULT NULL, p_max_txns int DEFAULT NULL,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_pool agent_cash_pool; v_old agency_banking; r agency_banking; v_row agency_banking;
  v_bank agent_banks; v_new_bank agent_banks; v_move jsonb;
  v_float_after numeric;
BEGIN
  v_pool := _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
  SELECT * INTO v_old FROM agency_banking WHERE agency_banking_id = p_id AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  PERFORM _banking_limits(p_user, p_row, p_day_start, p_limit, p_max_txns, p_id);
  r := jsonb_populate_record(NULL::agency_banking, p_row);
  v_float_after := v_old.float_after;

  IF v_old.agent_bank_id IS NOT NULL AND v_old.float_after IS NOT NULL
     AND (v_old.agent_bank_id IS DISTINCT FROM r.agent_bank_id
          OR v_old.amount <> r.amount
          OR v_old.transaction_type <> r.transaction_type) THEN
    -- lock both banks in a fixed order (no deadlock between two edits)
    PERFORM 1 FROM agent_banks
     WHERE user_id = p_user AND agent_bank_id IN (v_old.agent_bank_id, r.agent_bank_id)
     ORDER BY agent_bank_id FOR UPDATE;

    -- 1) reverse the original entry
    SELECT * INTO v_bank FROM agent_banks WHERE agent_bank_id = v_old.agent_bank_id AND user_id = p_user;
    IF FOUND THEN
      PERFORM _float_move(p_user, v_bank, _banking_kind(v_old.transaction_type::text) || '_REVERSAL',
                          v_old.amount, p_id, 'Edited — original entry reversed');
    END IF;

    -- 2) apply the new one (fails -> the reversal above is rolled back too)
    v_float_after := NULL;
    IF r.agent_bank_id IS NOT NULL THEN
      SELECT * INTO v_new_bank FROM agent_banks WHERE agent_bank_id = r.agent_bank_id AND user_id = p_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'BANK_NOT_FOUND'; END IF;
      v_move := _float_move(p_user, v_new_bank, _banking_kind(r.transaction_type::text), r.amount, p_id, NULL);
      v_float_after := (v_move->>'float_after')::numeric;
    END IF;
  END IF;

  UPDATE agency_banking SET
    customer_name = r.customer_name, customer_phone = r.customer_phone, customer_nic = r.customer_nic,
    account_number = r.account_number, source_of_funds = r.source_of_funds,
    transaction_type = r.transaction_type, agent_bank_id = r.agent_bank_id, amount = r.amount,
    service_fee = COALESCE(r.service_fee, 0), commission = COALESCE(r.commission, 0),
    channel = COALESCE(r.channel, 'pos_terminal'), tx_hour = r.tx_hour,
    created_offline = COALESCE(r.created_offline, false),
    banking_status = COALESCE(r.banking_status, 'COMPLETED'),
    is_anomaly = COALESCE(r.is_anomaly, false), anomaly_score = COALESCE(r.anomaly_score, 0),
    float_after = v_float_after, updated_at = now()
  WHERE agency_banking_id = p_id AND user_id = p_user
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('row', to_jsonb(v_row));
END $$;

-- ── DELETE /agency-banking/:id ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION banking_delete(
  p_user uuid, p_id uuid, p_today date,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_old agency_banking; v_bank agent_banks;
BEGIN
  SELECT * INTO v_old FROM agency_banking WHERE agency_banking_id = p_id AND user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_old.agent_bank_id IS NOT NULL AND v_old.float_after IS NOT NULL THEN
    PERFORM _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
    SELECT * INTO v_bank FROM agent_banks
     WHERE agent_bank_id = v_old.agent_bank_id AND user_id = p_user FOR UPDATE;
    IF FOUND THEN
      -- undo the float / cash movement before the record goes away
      PERFORM _float_move(p_user, v_bank, _banking_kind(v_old.transaction_type::text) || '_REVERSAL',
                          v_old.amount, p_id, 'Deleted — entry reversed');
    END IF;
  END IF;

  DELETE FROM agency_banking WHERE agency_banking_id = p_id AND user_id = p_user;
  RETURN jsonb_build_object('deleted', true);
END $$;

-- ── POST /agent-banks/:id/topup  (cash pool -> bank float, keeps the reserve) ─
CREATE OR REPLACE FUNCTION float_topup(
  p_user uuid, p_bank uuid, p_amount numeric, p_today date, p_note text DEFAULT 'Float top-up',
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_pool agent_cash_pool; v_bank agent_banks; v_reserve numeric; v_move jsonb;
BEGIN
  v_pool := _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
  SELECT * INTO v_bank FROM agent_banks WHERE agent_bank_id = p_bank AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BANK_NOT_FOUND'; END IF;

  v_reserve := COALESCE(NULLIF(v_pool.reserve_floor, 0), p_reserve);
  IF p_amount > v_pool.cash_on_hand - v_reserve THEN
    RAISE EXCEPTION 'TOPUP_EXCEEDS' USING DETAIL = json_build_object(
      'available', v_pool.cash_on_hand - v_reserve, 'reserve', v_reserve, 'cash', v_pool.cash_on_hand)::text;
  END IF;

  v_move := _float_move(p_user, v_bank, 'TOPUP', p_amount, NULL, p_note);
  RETURN v_move;
END $$;

-- ── POST /agent-banks/pool/add-cash ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION pool_add_cash(
  p_user uuid, p_amount numeric, p_today date,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS agent_cash_pool
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v agent_cash_pool;
BEGIN
  PERFORM _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
  UPDATE agent_cash_pool SET cash_on_hand = cash_on_hand + p_amount, updated_at = now()
   WHERE user_id = p_user RETURNING * INTO v;
  RETURN v;
END $$;

-- ── Read the pool (creates it / applies the daily reset under the lock) ───────
CREATE OR REPLACE FUNCTION agent_pool_get(
  p_user uuid, p_today date, p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS agent_cash_pool
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
END $$;

-- ── Only the backend (service_role key) may call these ────────────────────────
-- Supabase exposes every function in "public" over its REST API; without this, anyone
-- holding the project's anon key could call banking_post for any user_id.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    '_agent_pool_lock(uuid,date,numeric,numeric)',
    '_float_move(uuid,agent_banks,text,numeric,uuid,text)',
    '_banking_limits(uuid,jsonb,timestamptz,numeric,integer,uuid)',
    '_banking_kind(text)',
    'banking_post(uuid,jsonb,date,timestamptz,numeric,integer,numeric,numeric)',
    'banking_update(uuid,uuid,jsonb,date,timestamptz,numeric,integer,numeric,numeric)',
    'banking_delete(uuid,uuid,date,numeric,numeric)',
    'float_topup(uuid,uuid,numeric,date,text,numeric,numeric)',
    'pool_add_cash(uuid,numeric,date,numeric,numeric)',
    'agent_pool_get(uuid,date,numeric,numeric)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END $$;

-- PostgREST caches the list of functions; tell it to reload
NOTIFY pgrst, 'reload schema';

-- =============================================================================
--  PART 3 — TOKEN REVOCATION  (backend/src/utils/tokenVersion.js)
--  Each login token carries users.token_version; +1 signs the user out on every
--  device (password change / reset, "Sign out of all devices").
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  PART 4 — DUMMY BANK (customer accounts, OTPs, SMS inbox)  (sql/dummy_bank.sql)
-- =============================================================================

-- =============================================================================
-- Dummy bank core (simulated) — customer accounts behind the agency-banking module
-- -----------------------------------------------------------------------------
-- Run once in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- Only ADDS tables, columns and functions. No existing table, column or row is
-- dropped or deleted. Safe to run again (IF NOT EXISTS / CREATE OR REPLACE).
-- Needs sql/atomic_banking.sql (banking_post, banking_delete, _agent_pool_lock).
--
-- What it adds
--   bank_accounts        registered customer accounts of each partner bank, with a balance
--   bank_account_ledger  every balance change (the customer's statement)
--   bank_otps            one-time passwords for withdrawals (only a hash is stored)
--   customer_messages    simulated SMS / e-mail inbox of the customer (alerts, OTPs)
--
-- A deposit / withdrawal on a registered account runs as ONE transaction:
--   lock cash pool -> lock account -> (withdrawal: balance + OTP check)
--   -> banking_post (CBSL limits, float, cash pool) -> account balance + statement.
-- =============================================================================

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
    account_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    agent_bank_id   UUID          REFERENCES agent_banks(agent_bank_id) ON DELETE SET NULL,
    bank_name       VARCHAR(100)  NOT NULL,
    account_number  VARCHAR(30)   NOT NULL,
    holder_name     VARCHAR(150)  NOT NULL,
    holder_nic      VARCHAR(20),
    phone           VARCHAR(20)   NOT NULL,
    email           VARCHAR(255),
    balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bank_account_number UNIQUE (user_id, account_number),
    CONSTRAINT chk_bank_balance_non_neg CHECK (balance >= 0)
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id, agent_bank_id);

CREATE TABLE IF NOT EXISTS bank_account_ledger (
    entry_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        UUID          NOT NULL REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
    user_id           UUID          NOT NULL,
    agency_banking_id UUID          REFERENCES agency_banking(agency_banking_id) ON DELETE SET NULL,
    entry_type        VARCHAR(30)   NOT NULL,   -- DEPOSIT | WITHDRAWAL | *_REVERSAL | OPENING
    amount            NUMERIC(14,2) NOT NULL,   -- + credit, - debit
    balance_after     NUMERIC(14,2) NOT NULL,
    note              TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bal_account ON bank_account_ledger(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bank_otps (
    otp_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          NOT NULL,
    account_id   UUID          NOT NULL REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
    purpose      VARCHAR(30)   NOT NULL DEFAULT 'CASH_WITHDRAWAL',
    amount       NUMERIC(14,2) NOT NULL,
    code_hash    VARCHAR(64)   NOT NULL,        -- sha256 of the code; the code itself is never stored
    attempts     INT           NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ   NOT NULL,
    verified_at  TIMESTAMPTZ,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_otps_account ON bank_otps(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_messages (
    message_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          NOT NULL,
    account_id   UUID          REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
    channel      VARCHAR(10)   NOT NULL DEFAULT 'SMS',   -- SMS | EMAIL
    kind         VARCHAR(20)   NOT NULL,                 -- OTP | CREDIT | DEBIT | BALANCE | REVERSAL
    recipient    VARCHAR(255)  NOT NULL,
    body         TEXT          NOT NULL,
    delivery     VARCHAR(20)   NOT NULL DEFAULT 'SIMULATED', -- SIMULATED | SENT | FAILED
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_messages ON customer_messages(user_id, account_id, created_at DESC);

ALTER TABLE agency_banking
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(account_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS balance_after   NUMERIC(14,2);

ALTER TABLE bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_otps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_messages   ENABLE ROW LEVEL SECURITY;

-- ── Demo accounts: 4 fictitious customers per partner bank (only when the bank has none) ──
CREATE OR REPLACE FUNCTION bank_accounts_seed(p_user uuid)
RETURNS int
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  b agent_banks; i int; n int := 0; v_acc bank_accounts;
  names  text[] := ARRAY['Nimal Perera', 'Kumari Jayasinghe', 'Sunil Bandara', 'Dilani Fernando', 'Ruwan Wickramasinghe', 'Chamari Silva', 'Pradeep Kumara', 'Anoma Dissanayake'];
  nics   text[] := ARRAY['198512345671', '199076543210', '197845612378', '199512398745', '198234567890', '199845612301', '198967812345', '199312378945'];
  phones text[] := ARRAY['0771234561', '0712345672', '0763456783', '0704567894', '0755678905', '0726789016', '0787890127', '0748901238'];
  bals   numeric[] := ARRAY[48500, 125000, 18250, 76400, 230000, 9800, 54000, 162500];
  k int;
BEGIN
  FOR b IN SELECT * FROM agent_banks WHERE user_id = p_user ORDER BY created_at LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM bank_accounts WHERE user_id = p_user AND agent_bank_id = b.agent_bank_id);
    FOR i IN 1..4 LOOP
      k := ((n + i - 1) % 8) + 1;
      v_acc := NULL;  -- ON CONFLICT DO NOTHING returns no row; don't reuse the previous one
      INSERT INTO bank_accounts (user_id, agent_bank_id, bank_name, account_number, holder_name, holder_nic, phone, balance)
      VALUES (p_user, b.agent_bank_id, b.bank_name,
              -- 10-digit demo number, unique per agent
              lpad(((floor(random() * 9000000000) + 1000000000)::bigint)::text, 10, '0'),
              names[k], nics[k], phones[k], bals[k])
      ON CONFLICT (user_id, account_number) DO NOTHING
      RETURNING * INTO v_acc;
      IF v_acc.account_id IS NOT NULL THEN
        INSERT INTO bank_account_ledger (account_id, user_id, entry_type, amount, balance_after, note)
        VALUES (v_acc.account_id, p_user, 'OPENING', v_acc.balance, v_acc.balance, 'Opening balance (demo account)');
      END IF;
    END LOOP;
    n := n + 4;
  END LOOP;
  RETURN n;
END $$;

-- ── Deposit / withdrawal on a registered account (one transaction) ──────────────
-- p_row: same row as banking_post (+ account_number, agent_bank_id). For a withdrawal
-- p_otp_id must be an OTP verified by the backend for this account and amount.
CREATE OR REPLACE FUNCTION bank_account_post(
  p_user uuid, p_row jsonb, p_today date, p_day_start timestamptz,
  p_limit numeric DEFAULT NULL, p_max_txns int DEFAULT NULL,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000,
  p_otp_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_acc bank_accounts; v_kind text; v_amount numeric; v_new numeric; v_out jsonb; v_id uuid;
BEGIN
  -- same lock order as every other banking function: cash pool first, then the account
  PERFORM _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);

  SELECT * INTO v_acc FROM bank_accounts
   WHERE user_id = p_user
     AND account_number = btrim(p_row->>'account_number')
     AND agent_bank_id = NULLIF(p_row->>'agent_bank_id', '')::uuid
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_NOT_FOUND'; END IF;
  IF v_acc.status <> 'ACTIVE' THEN RAISE EXCEPTION 'ACCOUNT_INACTIVE'; END IF;

  v_kind := _banking_kind(upper(p_row->>'transaction_type'));
  v_amount := (p_row->>'amount')::numeric;

  IF v_kind = 'WITHDRAWAL' THEN
    IF v_acc.balance < v_amount THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING DETAIL = json_build_object('balance', v_acc.balance)::text;
    END IF;
    UPDATE bank_otps SET used_at = now()
     WHERE otp_id = p_otp_id AND account_id = v_acc.account_id AND user_id = p_user
       AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at > now() AND amount = v_amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'OTP_REQUIRED'; END IF;
  ELSIF v_kind <> 'DEPOSIT' THEN
    RAISE EXCEPTION 'UNSUPPORTED_ACCOUNT_TXN';
  END IF;

  -- CBSL limits, insert, float + cash pool (rolls back with everything else on error)
  v_out := banking_post(p_user, p_row, p_today, p_day_start, p_limit, p_max_txns, p_start_cash, p_reserve);
  v_id := (v_out->'row'->>'agency_banking_id')::uuid;

  v_new := CASE WHEN v_kind = 'DEPOSIT' THEN v_acc.balance + v_amount ELSE v_acc.balance - v_amount END;
  UPDATE bank_accounts SET balance = v_new, updated_at = now() WHERE account_id = v_acc.account_id;
  INSERT INTO bank_account_ledger (account_id, user_id, agency_banking_id, entry_type, amount, balance_after, note)
  VALUES (v_acc.account_id, p_user, v_id, v_kind,
          CASE WHEN v_kind = 'DEPOSIT' THEN v_amount ELSE -v_amount END, v_new,
          'Agent ' || lower(v_kind) || ' ' || (v_out->'row'->>'reference_code'));
  UPDATE agency_banking SET bank_account_id = v_acc.account_id, balance_after = v_new
   WHERE agency_banking_id = v_id;

  RETURN v_out || jsonb_build_object(
    'account', to_jsonb(v_acc) || jsonb_build_object('balance', v_new),
    'balance_before', v_acc.balance,
    'balance_after', v_new,
    'row', (v_out->'row') || jsonb_build_object('bank_account_id', v_acc.account_id, 'balance_after', v_new));
END $$;

-- ── Delete a transaction posted to an account: reverse the customer balance too ──
CREATE OR REPLACE FUNCTION bank_account_delete(
  p_user uuid, p_id uuid, p_today date,
  p_start_cash numeric DEFAULT 75000, p_reserve numeric DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_old agency_banking; v_acc bank_accounts; v_kind text; v_new numeric;
BEGIN
  PERFORM _agent_pool_lock(p_user, p_today, p_start_cash, p_reserve);
  SELECT * INTO v_old FROM agency_banking WHERE agency_banking_id = p_id AND user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_old.bank_account_id IS NOT NULL THEN
    SELECT * INTO v_acc FROM bank_accounts WHERE account_id = v_old.bank_account_id AND user_id = p_user FOR UPDATE;
    IF FOUND THEN
      v_kind := _banking_kind(v_old.transaction_type::text);
      IF v_kind = 'DEPOSIT' THEN
        IF v_acc.balance < v_old.amount THEN
          RAISE EXCEPTION 'CANNOT_UNDO_ACCOUNT' USING DETAIL = json_build_object('balance', v_acc.balance, 'amount', v_old.amount)::text;
        END IF;
        v_new := v_acc.balance - v_old.amount;
      ELSE
        v_new := v_acc.balance + v_old.amount;
      END IF;
      UPDATE bank_accounts SET balance = v_new, updated_at = now() WHERE account_id = v_acc.account_id;
      INSERT INTO bank_account_ledger (account_id, user_id, entry_type, amount, balance_after, note)
      VALUES (v_acc.account_id, p_user, v_kind || '_REVERSAL',
              CASE WHEN v_kind = 'DEPOSIT' THEN -v_old.amount ELSE v_old.amount END, v_new,
              'Reversal of ' || v_old.reference_code || ' (transaction deleted)');
    END IF;
  END IF;

  RETURN banking_delete(p_user, p_id, p_today, p_start_cash, p_reserve)
         || jsonb_build_object('account_id', v_acc.account_id, 'balance_after', v_new);
END $$;

-- Only the backend (service_role) may call these functions
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'bank_accounts_seed(uuid)',
    'bank_account_post(uuid,jsonb,date,timestamptz,numeric,int,numeric,numeric,uuid)',
    'bank_account_delete(uuid,uuid,date,numeric,numeric)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
