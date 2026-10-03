-- ============================================================================
--  SMART MERCHANT SUPPORT PLATFORM FOR AGENCY BANKING AND PROCUREMENT
--  Complete schema with automatic stock movement
-- ============================================================================

SET search_path TO public;

-- ============================================================================
--  ENUMS
-- ============================================================================

CREATE TYPE transaction_type_enum           AS ENUM ('SALE', 'PURCHASE', 'EXPENSE', 'DEPOSIT', 'TRANSFER');
CREATE TYPE payment_method_enum             AS ENUM ('CASH', 'BANK', 'DIGITAL');
CREATE TYPE inventory_unit_enum             AS ENUM ('KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'CARTON');
CREATE TYPE inventory_status_enum           AS ENUM ('AVAILABLE', 'RUNNING_OUT', 'OUT_OF_STOCK');
CREATE TYPE supplier_status_enum            AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE');
CREATE TYPE procurement_status_enum         AS ENUM ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED');
CREATE TYPE banking_transaction_type_enum   AS ENUM ('CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'FUND_TRANSFER', 'BALANCE_INQUIRY');
CREATE TYPE banking_status_enum             AS ENUM ('COMPLETED', 'PENDING', 'FAILED');
CREATE TYPE notification_type_enum          AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ALERT');
CREATE TYPE notification_category_enum      AS ENUM ('INVENTORY', 'BANKING', 'PROCUREMENT', 'TRANSACTION', 'SYSTEM');
CREATE TYPE sync_operation_enum             AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE sync_status_enum                AS ENUM ('QUEUED', 'SYNCED', 'FAILED');

-- ============================================================================
--  TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    user_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_code          VARCHAR(20)  NOT NULL DEFAULT ('MER-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),

    full_name          VARCHAR(150) NOT NULL,
    email              VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,

    reset_token        VARCHAR(255),
    reset_token_expiry TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,

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
CREATE TABLE inventory (
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
CREATE TABLE transactions (
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
CREATE TABLE suppliers (
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
CREATE TABLE procurement (
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
CREATE TABLE agency_banking (
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
CREATE TABLE notifications (
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
CREATE TABLE sync_queue (
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

CREATE INDEX idx_users_user_code ON users(user_code);
CREATE INDEX idx_users_email     ON users(email);

CREATE INDEX idx_txn_user  ON transactions(user_id, created_at DESC);
CREATE INDEX idx_txn_code  ON transactions(transaction_code);
CREATE INDEX idx_txn_type  ON transactions(transaction_type);
CREATE INDEX idx_txn_item  ON transactions(user_id, item_name);

CREATE INDEX idx_inv_user      ON inventory(user_id);
CREATE INDEX idx_inv_code      ON inventory(inventory_code);
CREATE INDEX idx_inv_item_name ON inventory(user_id, item_name);
CREATE INDEX idx_inv_status    ON inventory(item_status);

-- partial: only items at or below the reorder level (drives low-stock alerts)
CREATE INDEX idx_inv_low_stock ON inventory(user_id) WHERE quantity <= reorder_level;

CREATE INDEX idx_sup_user ON suppliers(user_id);
CREATE INDEX idx_sup_code ON suppliers(supplier_code);
CREATE INDEX idx_sup_name ON suppliers(supplier_name);

CREATE INDEX idx_prc_user   ON procurement(user_id, created_at DESC);
CREATE INDEX idx_prc_code   ON procurement(procurement_code);
CREATE INDEX idx_prc_status ON procurement(procurement_status);

CREATE INDEX idx_agb_user ON agency_banking(user_id, created_at DESC);
CREATE INDEX idx_agb_ref  ON agency_banking(reference_code);
CREATE INDEX idx_agb_type ON agency_banking(transaction_type);

CREATE INDEX idx_ntf_user ON notifications(user_id, created_at DESC);

-- partial: unread only (drives the notification bell badge)
CREATE INDEX idx_ntf_unread ON notifications(user_id) WHERE is_read = FALSE;

CREATE INDEX idx_sync_user    ON sync_queue(user_id);
CREATE INDEX idx_sync_pending ON sync_queue(user_id, created_at) WHERE sync_status = 'QUEUED';

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
-- NEXT: run sql/atomic_banking.sql (agency-banking float / cash-pool functions).
-- The backend calls those functions for every banking write; without them the
-- agency-banking and agent-bank endpoints return an error.
-- =============================================================================
