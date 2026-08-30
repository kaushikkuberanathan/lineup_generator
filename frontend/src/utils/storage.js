// ============================================================
// STORAGE - localStorage with in-memory fallback
// ============================================================
//
// Copied VERBATIM from App.jsx (~137-156). Same signatures, same in-memory
// (_mem) fallback for localStorage-absent/blocked browsers, same defaults.
// This is deliberately byte-for-byte identical behavior so the later migration
// of App.jsx and utils/finalizeSchedule.js onto this module is a no-op swap.
// Do NOT re-implement or "improve" — change here only alongside those call sites.

// Storage: localStorage with in-memory fallback
var _mem = {};

export function loadJSON(key, def) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) { return JSON.parse(raw); }
  } catch (e) {
    try { var mv = _mem[key]; if (mv) { return JSON.parse(mv); } } catch (e2) { /* ignored */ }
  }
  return def;
}

export function saveJSON(key, val) {
  var str = JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch (e) { _mem[key] = str; }
}

export function removeJSON(key) {
  delete _mem[key];
  try { localStorage.removeItem(key); } catch (e) {
    // localStorage can be unavailable in privacy mode; the memory copy is already removed.
  }
}
