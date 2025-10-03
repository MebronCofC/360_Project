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
