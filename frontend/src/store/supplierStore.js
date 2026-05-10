let _listeners = [];
let _state = { items: [], loading: false, error: null, lastFetched: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getSupplierState()        { return _state; }
export function setSupplierItems(items)   { _state = { ..._state, items, lastFetched: Date.now() }; notify(); }
export function setSupplierLoading(v)     { _state = { ..._state, loading: v }; notify(); }
export function setSupplierError(error)   { _state = { ..._state, error }; notify(); }
export function clearSupplierCache()      { _state = { ..._state, items: [], lastFetched: null }; notify(); }
export function subscribeSuppliers(fn)    { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
