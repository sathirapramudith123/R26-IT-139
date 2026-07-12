-- =========================================
-- V1__create_smart_merchant_platform_tables.sql
-- Smart Merchant Support Platform for Agency Banking and Procurement
-- =========================================

SET search_path TO public;

-- =========================================
-- ENUMS
-- =========================================

CREATE TYPE transaction_type_enum AS ENUM (
    'SALE', 'PURCHASE', 'EXPENSE', 'DEPOSIT', 'TRANSFER'
);

CREATE TYPE payment_method_enum AS ENUM (
    'CASH', 'BANK', 'DIGITAL'
);

CREATE TYPE inventory_unit_enum AS ENUM (
    'KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'CARTON'
);

CREATE TYPE inventory_status_enum AS ENUM (
    'AVAILABLE', 'RUNNING_OUT', 'OUT_OF_STOCK'
);

CREATE TYPE supplier_status_enum AS ENUM (
    'ACTIVE', 'PENDING', 'INACTIVE'
);

CREATE TYPE procurement_status_enum AS ENUM (
    'PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'
);

CREATE TYPE banking_transaction_type_enum AS ENUM (
    'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'FUND_TRANSFER', 'BALANCE_INQUIRY'
);

CREATE TYPE banking_status_enum AS ENUM (
    'COMPLETED', 'PENDING', 'FAILED'
);

CREATE TYPE notification_type_enum AS ENUM (
    'INFO', 'WARNING', 'SUCCESS', 'ALERT'
);

CREATE TYPE notification_category_enum AS ENUM (
    'INVENTORY', 'BANKING', 'PROCUREMENT', 'TRANSACTION', 'SYSTEM'
);

CREATE TYPE sync_operation_enum AS ENUM (
    'CREATE', 'UPDATE', 'DELETE'
);

CREATE TYPE sync_status_enum AS ENUM (
    'QUEUED', 'SYNCED', 'FAILED'
);

-- =========================================
-- TABLES
-- =========================================

-- =====================
-- USERS
-- Core merchant identity record.
-- user_id is the internal UUID; user_code is the UI-friendly code.
-- =====================
CREATE TABLE IF NOT EXISTS users (
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

    CONSTRAINT uq_users_user_code
        UNIQUE (user_code),

    CONSTRAINT chk_user_code_not_blank
        CHECK (LENGTH(TRIM(user_code)) > 0),

    CONSTRAINT chk_user_full_name_not_blank
        CHECK (LENGTH(TRIM(full_name)) > 0),

    CONSTRAINT chk_user_email_not_blank
        CHECK (LENGTH(TRIM(email)) > 0)
);

-- =====================
-- TRANSACTIONS
-- Feeds ML Component 1 (credit readiness).
-- =====================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id   UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(20)           NOT NULL DEFAULT ('TXN-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))),
    user_id          UUID                  NOT NULL,

    transaction_type transaction_type_enum NOT NULL,
    payment_method   payment_method_enum   NOT NULL,
    amount           NUMERIC(12,2)         NOT NULL,
    category         VARCHAR(100),
    description      TEXT,

    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_transaction_code
        UNIQUE (transaction_code),

    CONSTRAINT fk_transaction_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_transaction_amount_positive
        CHECK (amount > 0)
);

-- =====================
-- INVENTORY
-- Feeds ML Component 2 (demand forecasting).
-- =====================
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

    CONSTRAINT uq_inventory_code
        UNIQUE (inventory_code),

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_inventory_item_name_not_blank
        CHECK (LENGTH(TRIM(item_name)) > 0),

    CONSTRAINT chk_inventory_quantity_non_negative
        CHECK (quantity >= 0),

    CONSTRAINT chk_inventory_reorder_non_negative
        CHECK (reorder_level >= 0),

    CONSTRAINT chk_inventory_unit_price_non_negative
        CHECK (unit_price >= 0)
);

-- =====================
-- SUPPLIERS
-- Supplier register. Suppliers are data, not user accounts.
-- =====================
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

    CONSTRAINT uq_supplier_code
        UNIQUE (supplier_code),

    CONSTRAINT fk_supplier_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_supplier_name_not_blank
        CHECK (LENGTH(TRIM(supplier_name)) > 0),

    CONSTRAINT chk_supplier_contact_not_blank
        CHECK (LENGTH(TRIM(contact_number)) > 0),

    CONSTRAINT chk_supplier_unit_price_non_negative
        CHECK (unit_price >= 0),

    CONSTRAINT chk_supplier_delivery_cost_non_negative
        CHECK (delivery_cost >= 0),

    CONSTRAINT chk_supplier_available_quantity_non_negative
        CHECK (available_quantity >= 0)
);

-- =====================
-- PROCUREMENT
-- Feeds ML Component 3 (buy now vs wait).
-- =====================
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

    CONSTRAINT uq_procurement_code
        UNIQUE (procurement_code),

    CONSTRAINT fk_procurement_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_procurement_item_name_not_blank
        CHECK (LENGTH(TRIM(item_name)) > 0),

    CONSTRAINT chk_procurement_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT chk_procurement_selling_price_non_negative
        CHECK (expected_selling_price >= 0),

    CONSTRAINT chk_procurement_total_cost_non_negative
        CHECK (total_cost >= 0)
);

-- =====================
-- AGENCY BANKING
-- Feeds ML Component 4 (anomaly detection).
-- CBSL limits are enforced in the application layer.
-- =====================
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

    CONSTRAINT uq_agency_banking_reference_code
        UNIQUE (reference_code),

    CONSTRAINT fk_agency_banking_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_agency_customer_name_not_blank
        CHECK (LENGTH(TRIM(customer_name)) > 0),

    CONSTRAINT chk_agency_customer_phone_not_blank
        CHECK (LENGTH(TRIM(customer_phone)) > 0),

    CONSTRAINT chk_agency_amount_positive
        CHECK (amount > 0),

    CONSTRAINT chk_agency_service_fee_non_negative
        CHECK (service_fee >= 0),

    CONSTRAINT chk_agency_commission_non_negative
        CHECK (commission >= 0)
);

-- =====================
-- NOTIFICATIONS
-- In-app notifications raised by the system.
-- =====================
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
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notification_title_not_blank
        CHECK (LENGTH(TRIM(title)) > 0),

    CONSTRAINT chk_notification_message_not_blank
        CHECK (LENGTH(TRIM(message)) > 0)
);

-- =====================
-- SYNC QUEUE
-- Offline-first support. Queued operations are replayed on reconnect.
-- =====================
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

    CONSTRAINT fk_sync_queue_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sync_module_not_blank
        CHECK (LENGTH(TRIM(module)) > 0)
);

-- =========================================
-- INDEXES
-- =========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_user_code       ON users(user_code);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at   ON users(last_login_at);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_code     ON transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(transaction_type);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_user_id     ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_code        ON inventory(inventory_code);
CREATE INDEX IF NOT EXISTS idx_inventory_item_name   ON inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_status      ON inventory(item_status);

-- Partial index: items at or below reorder level (drives low-stock alerts)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
    ON inventory(user_id)
    WHERE quantity <= reorder_level;

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id     ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code        ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name        ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status      ON suppliers(supplier_status);

-- Procurement
CREATE INDEX IF NOT EXISTS idx_procurement_user_id   ON procurement(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procurement_code      ON procurement(procurement_code);
CREATE INDEX IF NOT EXISTS idx_procurement_status    ON procurement(procurement_status);

-- Agency Banking
CREATE INDEX IF NOT EXISTS idx_agency_banking_user_id ON agency_banking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_banking_ref     ON agency_banking(reference_code);
CREATE INDEX IF NOT EXISTS idx_agency_banking_type    ON agency_banking(transaction_type);
CREATE INDEX IF NOT EXISTS idx_agency_banking_status  ON agency_banking(banking_status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(notification_category);

-- Partial index: unread only (drives the notification bell badge)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id)
    WHERE is_read = FALSE;

-- Sync Queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id     ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status      ON sync_queue(sync_status);

-- Partial index: pending operations only
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
    ON sync_queue(user_id, created_at)
    WHERE sync_status = 'QUEUED';

-- =========================================
-- ROW LEVEL SECURITY
-- The backend uses the service_role key, which bypasses RLS.
-- Enabling RLS with no policies blocks all anon/authenticated key access,
-- so the REST API is the only way in.
-- =========================================
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue     ENABLE ROW LEVEL SECURITY;

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON TABLE users IS
'Core merchant identity record. One row per registered micro-merchant.';

COMMENT ON TABLE transactions IS
'All merchant financial activity. Aggregated features feed ML Component 1 (credit readiness).';

COMMENT ON TABLE inventory IS
'Stock items with reorder thresholds. Item history feeds ML Component 2 (demand forecasting).';

COMMENT ON TABLE suppliers IS
'Supplier register maintained by the merchant. Suppliers are data records, not platform user accounts.';

COMMENT ON TABLE procurement IS
'Procurement decisions. Price signals feed ML Component 3 (buy now vs wait).';

COMMENT ON TABLE agency_banking IS
'Banking transactions performed on behalf of customers. Feeds ML Component 4 (anomaly detection).';

COMMENT ON TABLE notifications IS
'In-app notifications such as low-stock alerts and banking confirmations.';

COMMENT ON TABLE sync_queue IS
'Offline-first support. Operations performed without connectivity are queued and replayed on reconnect.';

COMMENT ON COLUMN users.user_code IS
'UI-friendly merchant code such as MER-A3F91B2C. Shown instead of the internal UUID.';

COMMENT ON COLUMN users.password_hash IS
'Securely hashed password (bcrypt). Plain passwords are never stored.';

COMMENT ON COLUMN transactions.transaction_type IS
'SALE and DEPOSIT count as income; PURCHASE and EXPENSE count as outgoings.';

COMMENT ON COLUMN inventory.reorder_level IS
'Threshold at which the item is low on stock and a notification is raised.';

COMMENT ON COLUMN agency_banking.reference_code IS
'Reference code issued per banking transaction and shown on the customer receipt.';

COMMENT ON COLUMN agency_banking.created_offline IS
'TRUE when recorded without connectivity and later synced. Used as an anomaly-detection feature.';

COMMENT ON COLUMN notifications.link IS
'Optional in-app route to open when the notification is tapped, e.g. /dashboard/inventory.';

COMMENT ON COLUMN sync_queue.payload IS
'Full JSON body of the queued operation, replayed against the API when connectivity returns.';