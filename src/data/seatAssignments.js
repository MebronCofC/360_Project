// src/data/seatAssignments.js
import { 
  checkSeatsAvailability, 
  assignSeatsInDB, 
  releaseSeatInDB,
  getTicketsForEventFromDB,
  getEventInventoryDocFromDB
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
export async function assignSeats(eventId, seatIds = [], ownerUid, ticketIdBySeat = {}, eventTitle = "Event", startTime = null, endTime = null, userEmail = null, userName = null) {
  try {
    // Use provided event details or defaults
    const finalStartTime = startTime || new Date().toISOString();
    
    const orderId = await assignSeatsInDB(eventId, seatIds, ownerUid, eventTitle, finalStartTime, endTime, userEmail, userName);
    
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

// ===================== AVAILABILITY / INVENTORY =====================
// Section seating definitions duplicated from EventDetail logic for global calculations.
const LARGE_SECTIONS = new Set([110,111,112,113,114,115,101,102,103,104,105,106,107,109]);
const SMALL_SECTIONS = new Set([210,211,213,214,215,216,201,202,203,204,205,206,207,208,209]);

function totalSeatsForSection(sectionId) {
  const secStr = String(sectionId);
  const upper = secStr.toUpperCase();
  if (upper.includes("SUITE")) return 3 * 10; // Rows A-C, 10 per row
  const num = Number(secStr);
  if (!Number.isNaN(num)) {
    if (LARGE_SECTIONS.has(num)) return 12 * 18; // Rows A-L, 18 seats
    if (SMALL_SECTIONS.has(num)) return 5 * 18;  // Rows A-E, 18 seats
  }
  // Fallback: unknown section type – assume 0 (won't influence inventory messaging)
  return 0;
}

/**
 * Compute inventory stats for an event grouped by section.
 * Returns: {
 *   sections: {
 *     [sectionId]: { taken: number, total: number, remaining: number, remainingRatio: number }
 *   },
 *   lowInventorySections: number (count of sections with remainingRatio <= 0.35 and remaining > 0),
 *   soldOutSections: string[] (sections with remaining === 0 and total>0)
 * }
 */
export async function getEventInventory(eventId) {
  try {
    const tickets = await getTicketsForEventFromDB(eventId);
    const bySection = {};
    const unavailableBySection = {}; // seats explicitly marked unavailable by admin
    const reservedBySection = {};    // seats reserved by admin
    for (const t of tickets) {
      if (!t.seatId) continue;
      const section = String(t.seatId).split('-')[0];
      bySection[section] = (bySection[section] || 0) + 1;
      const ownerUid = (t.ownerUid || '').toUpperCase();
      if (ownerUid === 'ADMIN_UNAVAILABLE') {
        unavailableBySection[section] = (unavailableBySection[section] || 0) + 1;
      } else if (ownerUid === 'ADMIN_RESERVED') {
        reservedBySection[section] = (reservedBySection[section] || 0) + 1;
      }
    }
    const resultSections = {};
    let low = 0;
    const soldOut = [];
    const fullyUnavailable = [];
    for (const section of Object.keys(bySection)) {
      const taken = bySection[section];
      const total = totalSeatsForSection(section);
      if (total === 0) continue; // skip unknown config
      const remaining = Math.max(total - taken, 0);
      const remainingRatio = total > 0 ? remaining / total : 0;
      const unavailableCount = unavailableBySection[section] || 0;
      const reservedCount = reservedBySection[section] || 0;
      resultSections[section] = { 
        taken, 
        total, 
        remaining, 
        remainingRatio,
        unavailable: unavailableCount,
        reserved: reservedCount
      };
      // fully unavailable: all seats marked ADMIN_UNAVAILABLE
      if (unavailableCount === total && total > 0) {
        fullyUnavailable.push(section);
      } else if (remaining === 0) {
        soldOut.push(section);
      } else if (remainingRatio <= 0.35) {
        low++;
      }
    }
    // If we couldn't derive anything (likely due to restricted ticket reads), try public aggregated doc
    if (Object.keys(resultSections).length === 0) {
      const inv = await getEventInventoryDocFromDB(eventId);
      if (inv) {
        // Normalize legacy dotted keys like "sections.110.taken" into inv.sections map
        if (!inv.sections) {
          const dotted = Object.entries(inv).filter(([k]) => k.startsWith("sections."));
          if (dotted.length) {
            const rebuilt = {};
            for (const [key, val] of dotted) {
              const parts = key.split("."); // ["sections", "110", "taken"]
              const sec = parts[1];
              const prop = parts[2];
              if (!rebuilt[sec]) rebuilt[sec] = {};
              rebuilt[sec][prop] = val;
            }
            inv.sections = rebuilt;
          }
        }

        if (inv.sections) {
          const sections = {};
          let lowCount = 0;
          const sold = [];
          const fullyUnavail = [];
          for (const [sec, stats] of Object.entries(inv.sections)) {
            const total = (stats && stats.total != null) ? stats.total : totalSeatsForSection(sec);
            const taken = (stats && stats.taken != null) ? stats.taken : 0;
            const unavailable = (stats && stats.unavailable != null) ? stats.unavailable : 0;
            const remaining = Math.max(total - taken, 0);
            const remainingRatio = total > 0 ? remaining / total : 0;
            sections[sec] = { total, taken, remaining, remainingRatio, unavailable, reserved: 0 };

            // Check if fully unavailable (all admin-marked unavailable)
            if (unavailable === total && total > 0) {
              fullyUnavail.push(sec);
            }
            // Check if sold out (no seats remaining, regardless of reason)
            else if (remaining === 0 && total > 0) {
              sold.push(sec);
            }
            // Check for low inventory
            else if (remainingRatio <= 0.35 && remaining > 0) {
              lowCount++;
            }
          }
          return {
            sections,
            lowInventorySections: lowCount,
            soldOutSections: sold,
            fullyUnavailableSections: fullyUnavail
          };
        }
      }
    }
    return { 
      sections: resultSections, 
      lowInventorySections: low, 
      soldOutSections: soldOut,
      fullyUnavailableSections: fullyUnavailable
    };
  } catch (e) {
    console.error("Failed to compute inventory for event", eventId, e);
    return { sections: {}, lowInventorySections: 0, soldOutSections: [], fullyUnavailableSections: [] };
  }
}
