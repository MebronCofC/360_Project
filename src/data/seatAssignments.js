// src/data/seatAssignments.js
import { 
  checkSeatsAvailability, 
  assignSeatsInDB, 
  releaseSeatInDB,
  getTicketsForUserFromDB,
  getTicketsForEventFromDB
} from "../firebase/firestore";

/**
 * Get assigned seats for an event (returns Set of seatIds)
 */
export async function getAssignedSeats(eventId) {
  try {
    // Get all tickets for this event from Firestore
    const tickets = await getTicketsForEventFromDB(eventId);
    // Extract the seatIds and return as a Set
    const seatIds = tickets.map(ticket => ticket.seatId);
    return new Set(seatIds);
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
export async function assignSeats(eventId, seatIds = [], ownerUid, ticketIdBySeat = {}, eventTitle = "Event", startTime = null) {
  try {
    // Use provided event details or defaults
    const finalStartTime = startTime || new Date().toISOString();
    
    const orderId = await assignSeatsInDB(eventId, seatIds, ownerUid, eventTitle, finalStartTime);
    
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
