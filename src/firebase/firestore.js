import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { db } from "./firebase";

// ================ PUBLIC INVENTORY (AGGREGATED) HELPERS =================
// Read aggregated event inventory (public)
export async function getEventInventoryDocFromDB(eventId) {
  try {
    const invRef = doc(db, "eventInventories", eventId);
    const snap = await getDoc(invRef);
    if (!snap.exists()) return null;
    return snap.data();
  } catch (e) {
    console.error("Failed to read event inventory doc", e);
    return null;
  }
}

function totalSeatsForSectionRaw(sectionId) {
  const secStr = String(sectionId).toUpperCase();
  if (secStr.includes("SUITE")) return 3 * 10; // Rows A-C, 10 seats
  const num = Number(secStr);
  const LARGE = new Set([110,111,112,113,114,115,101,102,103,104,105,106,107,109]);
  const SMALL = new Set([210,211,213,214,215,216,201,202,203,204,205,206,207,208,209]);
  if (!Number.isNaN(num)) {
    if (LARGE.has(num)) return 12 * 18;
    if (SMALL.has(num)) return 5 * 18;
  }
  return 0;
}

// ==================== EVENTS ====================

// Get all events
export async function getEventsFromDB() {
  try {
    const eventsCol = collection(db, "events");
    const snapshot = await getDocs(eventsCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting events:", error);
    return [];
  }
}

// Get single event by ID
export async function getEventByIdFromDB(eventId) {
  try {
    const eventDoc = doc(db, "events", eventId);
    const snapshot = await getDoc(eventDoc);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting event:", error);
    return null;
  }
}

// Add new event
export async function addEventToDB(eventData) {
  try {
    const eventsCol = collection(db, "events");
    // Generate a slug from the title for use as the document ID
    const slug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add a timestamp to ensure uniqueness
    const uniqueId = `${slug}-${Date.now().toString(36)}`;
    
    const docRef = doc(eventsCol, uniqueId);
    await setDoc(docRef, {
      ...eventData,
      eventId: uniqueId,
      createdAt: serverTimestamp()
    });
    return uniqueId;
  } catch (error) {
    console.error("Error adding event:", error);
    throw error;
  }
}

// Update event
export async function updateEventInDB(eventId, updates) {
  try {
    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

// Delete event
export async function deleteEventFromDB(eventId) {
  try {
    const eventDoc = doc(db, "events", eventId);
    // Invalidate all tickets for this event
    await invalidateTicketsForEventInDB(eventId);
    await deleteDoc(eventDoc);
    // Also delete all seats for this event
    await deleteSeatsForEvent(eventId);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
}

// Move an event to the pastEvents collection and remove it from active events
export async function moveEventToPastInDB(eventId) {
  try {
    const eventDocRef = doc(db, "events", eventId);
    const snap = await getDoc(eventDocRef);
    if (!snap.exists()) return false;
    const data = snap.data();

    const pastCol = collection(db, "pastEvents");
    const pastDocRef = doc(pastCol, eventId);
    await setDoc(pastDocRef, {
      ...data,
      archivedAt: serverTimestamp(),
    });

    // Delete from active events and remove seats
    await deleteDoc(eventDocRef);
    await deleteSeatsForEvent(eventId);
    return true;
  } catch (error) {
    console.error("Error moving event to past:", error);
    throw error;
  }
}

// Get all past events
export async function getPastEventsFromDB() {
  try {
    const pastCol = collection(db, "pastEvents");
    const snapshot = await getDocs(pastCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting past events:", error);
    return [];
  }
}

// ==================== SEATS ====================

// Get seats for an event
export async function getSeatsForEventFromDB(eventId) {
  try {
    const seatsCol = collection(db, "seats");
    const q = query(seatsCol, where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting seats:", error);
    return [];
  }
}

// Add seat to event
export async function addSeatToEventInDB(eventId, seatData) {
  try {
    // Get event details for naming
    const eventDoc = await getEventByIdFromDB(eventId);
    if (!eventDoc) {
      throw new Error("Event not found");
    }
    
    // Create a clean event slug for document IDs
    const eventSlug = eventDoc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    const seatsCol = collection(db, "seats");
    // Create structured seat ID: eventName-seat-{seatId}
    const seatDocId = `${eventSlug}-seat-${seatData.seatId}`;
    const seatRef = doc(seatsCol, seatDocId);
    
    await setDoc(seatRef, {
      seatDocId,
      eventId,
      eventTitle: eventDoc.title,
      ...seatData,
      isAvailable: true,
      createdAt: serverTimestamp()
    });
    
    return seatDocId;
  } catch (error) {
    console.error("Error adding seat:", error);
    throw error;
  }
}

// Update seat
export async function updateSeatInDB(seatId, updates) {
  try {
    const seatDoc = doc(db, "seats", seatId);
    await updateDoc(seatDoc, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating seat:", error);
    throw error;
  }
}

// Delete seat
export async function deleteSeatFromDB(seatId) {
  try {
    const seatDoc = doc(db, "seats", seatId);
    await deleteDoc(seatDoc);
  } catch (error) {
    console.error("Error deleting seat:", error);
    throw error;
  }
}

// Delete all seats for an event (helper)
async function deleteSeatsForEvent(eventId) {
  try {
    const seatsCol = collection(db, "seats");
    const q = query(seatsCol, where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error deleting seats for event:", error);
  }
}

// Invalidate tickets for a deleted event
export async function invalidateTicketsForEventInDB(eventId) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(ticketsCol, where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, {
        status: "Invalid",
        invalidReason: "The Event has been cancelled",
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error invalidating tickets for event:", error);
  }
}

// Delete all tickets for an event (admin function)
export async function deleteAllTicketsForEventFromDB(eventId) {
  try {
    console.log("Starting deletion of all tickets for event:", eventId);
    
    const ticketsCol = collection(db, "tickets");
    const q = query(ticketsCol, where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    
    console.log("Found tickets to delete:", snapshot.docs.length);
    
    if (snapshot.empty) {
      console.log("No tickets to delete for event:", eventId);
      return { deleted: 0 };
    }

    // Use multiple batches if needed (Firestore limit is 500 operations per batch)
    const batchSize = 500;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    // Delete all ticket documents
    snapshot.docs.forEach((ticketDoc, index) => {
      currentBatch.delete(ticketDoc.ref);
      operationCount++;
      
      // Start a new batch if we hit the limit
      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Delete the event inventory aggregate in a separate batch to ensure it completes
    const invBatch = writeBatch(db);
    const invRef = doc(db, "eventInventories", eventId);
    invBatch.delete(invRef);
    batches.push(invBatch);

    // Commit all batches
    console.log("Committing", batches.length, "batch(es)...");
    await Promise.all(batches.map(batch => batch.commit()));
    
    console.log("Successfully deleted", snapshot.docs.length, "tickets and reset inventory");
    return { deleted: snapshot.docs.length };
  } catch (error) {
    console.error("Error deleting all tickets for event:", error);
    console.error("Error details:", error.message, error.code);
    throw error;
  }
}

// ==================== TICKETS ====================

// Get tickets for a user
export async function getTicketsForUserFromDB(userId) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(ticketsCol, where("ownerUid", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets:", error);
    return [];
  }
}

// Get all tickets for an event
export async function getTicketsForEventFromDB(eventId) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(ticketsCol, where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets for event:", error);
    return [];
  }
}

// Get tickets by seat ID (useful for checking seat assignment)
export async function getTicketsBySeatIdFromDB(eventId, seatId) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(
      ticketsCol, 
      where("eventId", "==", eventId),
      where("seatId", "==", seatId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets by seat:", error);
    return [];
  }
}

// Get tickets by section (useful for section-level management)
export async function getTicketsBySectionFromDB(eventId, section) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(
      ticketsCol, 
      where("eventId", "==", eventId),
      where("section", "==", section)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets by section:", error);
    return [];
  }
}

// Add ticket
export async function addTicketToDB(ticketData) {
  try {
    const ticketsCol = collection(db, "tickets");
    const docRef = await addDoc(ticketsCol, {
      ...ticketData,
      status: "Issued",
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding ticket:", error);
    throw error;
  }
}

// Delete ticket
export async function deleteTicketFromDB(ticketId) {
  try {
    const ticketDoc = doc(db, "tickets", ticketId);
    await deleteDoc(ticketDoc);
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
}

// Check if seats are available
export async function checkSeatsAvailability(eventId, seatIds) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(
      ticketsCol, 
      where("eventId", "==", eventId)
    );
    const snapshot = await getDocs(q);
    
    const takenSeats = new Set(
      snapshot.docs.map(doc => doc.data().seatId)
    );
    
    const unavailable = seatIds.filter(seatId => takenSeats.has(seatId));
    return unavailable;
  } catch (error) {
    console.error("Error checking seat availability:", error);
    return seatIds; // Assume all unavailable on error
  }
}

// Assign seats (create tickets)
export async function assignSeatsInDB(eventId, seatIds, ownerUid, eventTitle, startTime, endTime = null, userEmail = null, userName = null) {
  try {
    // Check availability first
    const unavailable = await checkSeatsAvailability(eventId, seatIds);
    if (unavailable.length > 0) {
      throw new Error(`Seats already taken: ${unavailable.join(", ")}`);
    }
    
    // Create a clean event slug for document IDs
    const eventSlug = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30); // Limit length
    
    // Create tickets in batch
    const orderId = `ord_${Math.random().toString(36).slice(2, 10)}`;
    const batch = writeBatch(db);
    const ticketsCol = collection(db, "tickets");
    const sectionDeltas = {};
    
    // Get current ticket count for this event to generate sequential numbers
    const existingTicketsQuery = query(ticketsCol, where("eventId", "==", eventId));
    const existingTicketsSnapshot = await getDocs(existingTicketsQuery);
    let ticketNumber = existingTicketsSnapshot.docs.length + 1;
    
    seatIds.forEach(seatId => {
      // Create structured ticket ID: eventName-ticket-{number}
      const ticketDocId = `${eventSlug}-ticket-${ticketNumber}`;
      ticketNumber++;
      
      const ticketRef = doc(ticketsCol, ticketDocId);
      batch.set(ticketRef, {
        // Core identifiers for relationships
        ticketId: ticketDocId,
        orderId,
        ownerUid,
        ownerEmail: userEmail || null,
        ownerName: userName || null,
        
        // Event relationship
        eventId,
        eventTitle,
        startTime,
        endTime: endTime || null,
        
        // Seat relationship
        seatId,
        section: String(seatId).split('-')[0],
        
        // QR and status
        qrPayload: `ticket:${orderId}:${seatId}:${eventId}`,
        status: "Issued",
        createdAt: serverTimestamp()
      });

      const section = String(seatId).split('-')[0];
      if (!sectionDeltas[section]) sectionDeltas[section] = { taken: 0, unavailable: 0 };
      if (String(ownerUid).toUpperCase() === 'ADMIN_UNAVAILABLE') {
        sectionDeltas[section].unavailable += 1;
      } else {
        sectionDeltas[section].taken += 1;
      }
    });

    // Commit the ticket creation batch first
    await batch.commit();
    
    // Write aggregated public inventory updates in a separate transaction
    // This allows non-admin users to create tickets while keeping inventory writes controlled
    if (Object.keys(sectionDeltas).length) {
      try {
        const invRef = doc(db, "eventInventories", eventId);
        
        // Calculate total seats being sold (excluding admin unavailable)
        let totalSeatsSold = 0;
        const sectionsUpdate = {};
        
        for (const [section, delta] of Object.entries(sectionDeltas)) {
          sectionsUpdate[section] = {
            taken: increment(delta.taken),
            unavailable: increment(delta.unavailable),
            total: totalSeatsForSectionRaw(section)
          };
          // Only count actual sales (not admin unavailable) toward total
          totalSeatsSold += delta.taken;
        }
        
        const updates = {
          sections: sectionsUpdate,
          totalSeatsSold: increment(totalSeatsSold),
          updatedAt: serverTimestamp()
        };
        
        // Use set with merge to upsert and merge nested sections correctly
        await setDoc(invRef, updates, { merge: true });
      } catch (invError) {
        // If inventory update fails (e.g., permission denied), log but don't fail the ticket creation
        console.warn("Inventory update failed (tickets still created):", invError);
      }
    }
    return orderId;
  } catch (error) {
    console.error("Error assigning seats:", error);
    throw error;
  }
}

// Release seat (delete ticket)
export async function releaseSeatInDB(eventId, seatId, ownerUid) {
  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(
      ticketsCol,
      where("eventId", "==", eventId),
      where("seatId", "==", seatId),
      where("ownerUid", "==", ownerUid)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      const section = String(seatId).split('-')[0];
      const isUnavailable = String(data.ownerUid || '').toUpperCase() === 'ADMIN_UNAVAILABLE';

      // Delete the ticket first
      await deleteDoc(docSnap.ref);

      // Update inventory in a separate operation (graceful failure if permission denied)
      try {
        const invRef = doc(db, "eventInventories", eventId);
        const invUpdates = {
          updatedAt: serverTimestamp(),
          sections: {
            [section]: isUnavailable
              ? { unavailable: increment(-1) }
              : { taken: increment(-1) }
          }
        };
        // Decrement total sold seats count (only for actual sales, not admin unavailable)
        if (!isUnavailable) {
          invUpdates.totalSeatsSold = increment(-1);
        }
        
        await setDoc(invRef, invUpdates, { merge: true });
      } catch (invError) {
        // If inventory update fails, log but don't fail the ticket deletion
        console.warn("Inventory update failed (ticket still deleted):", invError);
      }
    }
  } catch (error) {
    console.error("Error releasing seat:", error);
    throw error;
  }
}
