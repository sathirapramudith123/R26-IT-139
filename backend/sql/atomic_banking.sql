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
