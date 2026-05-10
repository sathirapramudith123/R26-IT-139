let _listeners = [];
let _state = { items: [], loading: false, error: null, lastFetched: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getInventoryState()       { return _state; }
export function setInventoryItems(items)  { _state = { ..._state, items, lastFetched: Date.now() }; notify(); }
export function setInventoryLoading(v)    { _state = { ..._state, loading: v }; notify(); }
export function setInventoryError(error)  { _state = { ..._state, error }; notify(); }
export function clearInventoryCache()     { _state = { ..._state, items: [], lastFetched: null }; notify(); }
export function subscribeInventory(fn)    { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
