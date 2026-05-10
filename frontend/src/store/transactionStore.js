let _listeners = [];
let _state = { items: [], loading: false, error: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getTransactionState()       { return _state; }
export function setTransactionItems(items)  { _state = { ..._state, items }; notify(); }
export function setTransactionLoading(v)    { _state = { ..._state, loading: v }; notify(); }
export function setTransactionError(e)      { _state = { ..._state, error: e }; notify(); }
export function subscribeTransactions(fn)   { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
