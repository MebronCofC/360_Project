// src/data/seatAssignments.js

const KEY = "seatAssignments";
/**
 * localStorage shape:
 * {
 *   [eventId]: {
 *     [seatId]: { ticketId: "t_xxx", ownerUid: "uid123" }
 *   }
 * }
 */

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAssignedSeats(eventId) {
  const all = readAll();
  const map = all[eventId] || {};
  return new Set(Object.keys(map));
}

/** Returns any seats that are already taken (i.e., NOT available) */
export function areAvailable(eventId, seatIds = []) {
  const assigned = getAssignedSeats(eventId);
  return seatIds.filter(s => assigned.has(s));
}

/** Assign seats to an owner; throws if any already taken */
export function assignSeats(eventId, seatIds = [], ownerUid, ticketIdBySeat = {}) {
  const all = readAll();
  const eventMap = all[eventId] || {};

  for (const seatId of seatIds) {
    if (eventMap[seatId]) {
      throw new Error(`Seat ${seatId} already assigned`);
    }
  }

  for (const seatId of seatIds) {
    const ticketId = ticketIdBySeat[seatId] || `t_${Math.random().toString(36).slice(2,10)}`;
    eventMap[seatId] = { ticketId, ownerUid: ownerUid || null };
  }

  all[eventId] = eventMap;
  writeAll(all);

  return seatIds.map(seatId => ({ seatId, ticketId: eventMap[seatId].ticketId }));
}

/** Release a seat (only by same owner); returns true if released */
export function releaseSeat(eventId, seatId, ownerUid) {
  const all = readAll();
  const eventMap = all[eventId] || {};
  const entry = eventMap[seatId];
  if (!entry) return false;
  if (entry.ownerUid && ownerUid && entry.ownerUid !== ownerUid) return false;

  delete eventMap[seatId];
  all[eventId] = eventMap;
  writeAll(all);
  return true;
}
