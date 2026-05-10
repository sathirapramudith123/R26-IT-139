let _listeners = [];
let _state = { items: [], recommendations: [], loading: false, error: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getProcurementState()         { return _state; }
export function setProcurementItems(items)    { _state = { ..._state, items }; notify(); }
export function setRecommendations(recs)      { _state = { ..._state, recommendations: recs }; notify(); }
export function setProcurementLoading(v)      { _state = { ..._state, loading: v }; notify(); }
export function setProcurementError(e)        { _state = { ..._state, error: e }; notify(); }
export function subscribeProcurement(fn)      { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
