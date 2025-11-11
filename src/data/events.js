// src/data/events.js
import { 
  getEventsFromDB, 
  addEventToDB, 
  updateEventInDB,
  deleteEventFromDB,
  getSeatsForEventFromDB,
  addSeatToEventInDB,
  deleteSeatFromDB,
  updateSeatInDB,
  moveEventToPastInDB,
  getPastEventsFromDB
} from "../firebase/firestore";

// Default demo seats for new events
export function getDefaultSeats() {
  return [
    { seatId: "A1", label: "A1", isAda: false },
    { seatId: "A2", label: "A2", isAda: false },
    { seatId: "A3", label: "A3", isAda: false },
    { seatId: "A4", label: "A4", isAda: true  },
    { seatId: "B1", label: "B1", isAda: false },
    { seatId: "B2", label: "B2", isAda: false },
    { seatId: "B3", label: "B3", isAda: false },
    { seatId: "B4", label: "B4", isAda: true  },
    { seatId: "C1", label: "C1", isAda: false },
    { seatId: "C2", label: "C2", isAda: false },
    { seatId: "C3", label: "C3", isAda: false },
    { seatId: "C4", label: "C4", isAda: false },
  ];
}

// ==================== EVENTS ====================

export async function getEvents() {
  return await getEventsFromDB();
}

export async function getPastEvents() {
  return await getPastEventsFromDB();
}

export async function addEvent(event) {
  if (!event.startTime || !event.endTime) {
    throw new Error("startTime and endTime are required");
  }
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  if (!(start instanceof Date) || isNaN(start) || !(end instanceof Date) || isNaN(end) || end <= start) {
    throw new Error("endTime must be after startTime");
  }
  const eventId = await addEventToDB(event);
  
  // Add default seats for new event
  const defaultSeats = getDefaultSeats();
  for (const seat of defaultSeats) {
    await addSeatToEventInDB(eventId, seat);
  }
  
  return eventId;
}

export async function removeEvent(eventId) {
  await deleteEventFromDB(eventId);
}

export async function updateEvent(eventId, updates) {
  if ((updates.startTime && !updates.endTime) || (!updates.startTime && updates.endTime)) {
    // If either is provided, both should be validated together; try to read the other from DB would require extra call.
    // For simplicity, enforce both provided when changing times.
    throw new Error("Provide both startTime and endTime when updating times");
  }
  if (updates.startTime && updates.endTime) {
    const start = new Date(updates.startTime);
    const end = new Date(updates.endTime);
    if (!(start instanceof Date) || isNaN(start) || !(end instanceof Date) || isNaN(end) || end <= start) {
      throw new Error("endTime must be after startTime");
    }
  }
  await updateEventInDB(eventId, updates);
}

// Archive any events that have ended (client-side sweep)
export async function archiveFinishedEvents() {
  const now = new Date();
  const events = await getEventsFromDB();
  for (const ev of events) {
    if (ev.endTime && new Date(ev.endTime) < now) {
      try {
        await moveEventToPastInDB(ev.id || ev.eventId);
      } catch (e) {
        console.error("Failed to archive event", ev.id || ev.eventId, e);
      }
    }
  }
}

// ==================== SEATS ====================

export async function getSeatsForEvent(eventId) {
  const seats = await getSeatsForEventFromDB(eventId);
  // If no seats exist, return default seats for compatibility
  return seats.length > 0 ? seats : getDefaultSeats();
}

export async function addSeatToEvent(eventId, seat) {
  return await addSeatToEventInDB(eventId, seat);
}

export async function removeSeatFromEvent(eventId, seatId) {
  // Find the seat document by eventId and seatId
  const seats = await getSeatsForEventFromDB(eventId);
  const seatDoc = seats.find(s => s.seatId === seatId);
  if (seatDoc && seatDoc.id) {
    await deleteSeatFromDB(seatDoc.id);
  }
}

export async function updateSeatForEvent(eventId, seatId, updates) {
  // Find the seat document by eventId and seatId
  const seats = await getSeatsForEventFromDB(eventId);
  const seatDoc = seats.find(s => s.seatId === seatId);
  if (seatDoc && seatDoc.id) {
    await updateSeatInDB(seatDoc.id, updates);
  }
}

// Async version for fetching seats
export async function seatsForEvent(eventId) {
  return await getSeatsForEvent(eventId);
}
