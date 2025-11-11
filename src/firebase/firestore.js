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
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

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
    const seatsCol = collection(db, "seats");
    const docRef = await addDoc(seatsCol, {
      eventId,
      ...seatData,
      isAvailable: true,
      createdAt: serverTimestamp()
    });
    return docRef.id;
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
export async function assignSeatsInDB(eventId, seatIds, ownerUid, eventTitle, startTime, endTime = null) {
  try {
    // Check availability first
    const unavailable = await checkSeatsAvailability(eventId, seatIds);
    if (unavailable.length > 0) {
      throw new Error(`Seats already taken: ${unavailable.join(", ")}`);
    }
    
    // Create tickets in batch
    const orderId = `ord_${Math.random().toString(36).slice(2, 10)}`;
    const batch = writeBatch(db);
    const ticketsCol = collection(db, "tickets");
    
    seatIds.forEach(seatId => {
      const ticketId = `t_${Math.random().toString(36).slice(2, 10)}`;
      const ticketRef = doc(ticketsCol, ticketId);
      batch.set(ticketRef, {
        orderId,
        ownerUid,
        eventId,
        eventTitle,
        startTime,
        endTime: endTime || null,
        seatId,
        qrPayload: `ticket:${orderId}:${seatId}:${eventId}`,
        status: "Issued",
        createdAt: serverTimestamp()
      });
    });
    
    await batch.commit();
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
      await deleteDoc(snapshot.docs[0].ref);
    }
  } catch (error) {
    console.error("Error releasing seat:", error);
    throw error;
  }
}
