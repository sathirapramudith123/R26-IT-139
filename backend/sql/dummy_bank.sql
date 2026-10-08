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
