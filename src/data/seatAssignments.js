// src/data/seatAssignments.js
import { 
  checkSeatsAvailability, 
  assignSeatsInDB, 
  releaseSeatInDB,
  getTicketsForUserFromDB
} from "../firebase/firestore";

/**
 * Get assigned seats for an event (returns Set of seatIds)
 */
export async function getAssignedSeats(eventId) {
  try {
    // This is a placeholder - in real usage, we'd query all tickets for this event
    // For now, we'll return an empty set and rely on checkSeatsAvailability
    return new Set();
  } catch (error) {
    console.error("Error getting assigned seats:", error);
    return new Set();
  }
}

/** 
 * Returns any seats that are already taken (i.e., NOT available) 
 */
export async function areAvailable(eventId, seatIds = []) {
  const unavailable = await checkSeatsAvailability(eventId, seatIds);
  return unavailable;
}

/** 
 * Assign seats to an owner; throws if any already taken 
 */
export async function assignSeats(eventId, seatIds = [], ownerUid, ticketIdBySeat = {}) {
  try {
    // Get event details for the tickets
    const eventTitle = "Event"; // You can pass this in or fetch from DB
    const startTime = new Date().toISOString(); // Or fetch from event
    
    const orderId = await assignSeatsInDB(eventId, seatIds, ownerUid, eventTitle, startTime);
    
    return seatIds.map(seatId => ({
      seatId,
      ticketId: ticketIdBySeat[seatId] || `t_${Math.random().toString(36).slice(2, 10)}`,
      orderId
    }));
  } catch (error) {
    console.error("Error assigning seats:", error);
    throw error;
  }
}

/** 
 * Release a seat (only by same owner); returns true if released 
 */
export async function releaseSeat(eventId, seatId, ownerUid) {
  try {
    await releaseSeatInDB(eventId, seatId, ownerUid);
    return true;
  } catch (error) {
    console.error("Error releasing seat:", error);
    return false;
  }
}
