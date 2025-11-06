// src/data/events.js
import { 
  getEventsFromDB, 
  addEventToDB, 
  deleteEventFromDB,
  getSeatsForEventFromDB,
  addSeatToEventInDB,
  deleteSeatFromDB,
  updateSeatInDB
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

export async function addEvent(event) {
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
