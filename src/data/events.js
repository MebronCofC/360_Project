// src/data/events.js
export const EVENTS = [
  { id: "bb-2025-01", title: "CofC vs UNCW", startTime: "2025-11-12T19:00:00", venueId: "td-arena", basePrice: 20 },
  { id: "bb-2025-02", title: "CofC vs W&M",  startTime: "2025-11-20T19:00:00", venueId: "td-arena", basePrice: 22 },
];

// keep the seat list small for the prototype
export function seatsForEvent(eventId) {
  // 12 demo seats, include a few ADA
  return [
    { id: "A1", label: "A1", isAda: false },
    { id: "A2", label: "A2", isAda: false },
    { id: "A3", label: "A3", isAda: false },
    { id: "A4", label: "A4", isAda: true  },
    { id: "B1", label: "B1", isAda: false },
    { id: "B2", label: "B2", isAda: false },
    { id: "B3", label: "B3", isAda: false },
    { id: "B4", label: "B4", isAda: true  },
    { id: "C1", label: "C1", isAda: false },
    { id: "C2", label: "C2", isAda: false },
    { id: "C3", label: "C3", isAda: false },
    { id: "C4", label: "C4", isAda: false },
  ];
}

// Persistent event helpers
export function getEvents() {
  const stored = localStorage.getItem('events');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...EVENTS];
    }
  }
  return [...EVENTS];
}

export function addEvent(event) {
  const events = getEvents();
  events.push(event);
  localStorage.setItem('events', JSON.stringify(events));
}

export function removeEvent(eventId) {
  const events = getEvents().filter(e => e.id !== eventId);
  localStorage.setItem('events', JSON.stringify(events));
  // Also remove seats for this event
  localStorage.removeItem(`seats_${eventId}`);
}

// Persistent seat helpers
export function getSeatsForEvent(eventId) {
  const stored = localStorage.getItem(`seats_${eventId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return seatsForEvent(eventId);
    }
  }
  return seatsForEvent(eventId);
}

export function addSeatToEvent(eventId, seat) {
  const seats = getSeatsForEvent(eventId);
  seats.push(seat);
  localStorage.setItem(`seats_${eventId}`, JSON.stringify(seats));
}

export function removeSeatFromEvent(eventId, seatId) {
  const seats = getSeatsForEvent(eventId).filter(s => s.id !== seatId);
  localStorage.setItem(`seats_${eventId}`, JSON.stringify(seats));
}

export function updateSeatForEvent(eventId, seatId, updates) {
  const seats = getSeatsForEvent(eventId).map(s =>
    s.id === seatId ? { ...s, ...updates } : s
  );
  localStorage.setItem(`seats_${eventId}`, JSON.stringify(seats));
}
