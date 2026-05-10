let _listeners = [];
let _state = { items: [], summary: null, paymentSplit: {}, loading: false, error: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getLedgerState()           { return _state; }
export function setLedgerItems(items)      { _state = { ..._state, items }; notify(); }
export function setLedgerSummary(summary)  { _state = { ..._state, summary }; notify(); }
export function setLedgerPaymentSplit(p)   { _state = { ..._state, paymentSplit: p }; notify(); }
export function setLedgerLoading(v)        { _state = { ..._state, loading: v }; notify(); }
export function setLedgerError(error)      { _state = { ..._state, error }; notify(); }
export function subscribeLedger(fn)        { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
