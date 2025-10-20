// src/data/sales.js

const KEY = "soldSeats";

/** Returns a Set of sold seatIds for the given eventId */
export function getSoldSeats(eventId) {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    const arr = Array.isArray(data[eventId]) ? data[eventId] : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Marks the given seatIds as sold for the eventId (idempotent) */
export function markSeatsSold(eventId, seatIds = []) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  const existing = new Set(Array.isArray(data[eventId]) ? data[eventId] : []);
  for (const s of seatIds) existing.add(s);
  data[eventId] = Array.from(existing);
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Checks if any of seatIds are already sold (returns an array of conflicts) */
export function findConflicts(eventId, seatIds = []) {
  const sold = getSoldSeats(eventId);
  return seatIds.filter(s => sold.has(s));
}
