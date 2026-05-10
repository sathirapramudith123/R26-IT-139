let _listeners = [];
let _state = { items: [], unreadCount: 0, loading: false, error: null };

function notify() { _listeners.forEach(fn => fn(_state)); }

export function getNotificationState()     { return _state; }
export function setNotifications(items)    { _state = { ..._state, items, unreadCount: items.filter(i => !i.is_read).length }; notify(); }
export function setNotificationLoading(v)  { _state = { ..._state, loading: v }; notify(); }
export function setNotificationError(e)    { _state = { ..._state, error: e }; notify(); }
export function subscribeNotifications(fn) { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
