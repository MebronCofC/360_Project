import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvents, seatsForEvent, getSeatsForEvent, addSeatToEvent, removeSeatFromEvent, updateSeatForEvent } from "../../data/events";
import { assignSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";
import { getAssignedSeats } from "../../data/seatAssignments";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const ev = useMemo(() => getEvents().find((e) => e.id === eventId), [eventId]);
  const seats = useMemo(() => seatsForEvent(eventId), [eventId]);
  const [adminSeats, setAdminSeats] = React.useState(() => getSeatsForEvent(eventId));
  const { isAdmin } = useAuth();
  // admin helpers
  const refreshSeats = () => setAdminSeats(getSeatsForEvent(eventId));

  const onAddSeat = (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value.trim();
    const label = form.label.value.trim() || id;
    const isAda = !!form.isAda.checked;
    if (!id) return;
    addSeatToEvent(eventId, { id, label, isAda });
    form.reset();
    refreshSeats();
  };

  // eslint-disable-next-line no-restricted-globals
  const onRemoveSeat = (seatId) => {
    if (!window.confirm('Remove seat ' + seatId + '?')) return;
    removeSeatFromEvent(eventId, seatId);
    refreshSeats();
  };

  // No confirm here, just updating seat
  const onToggleAda = (seatId) => {
    const seat = getSeatsForEvent(eventId).find(s => s.id === seatId);
    if (!seat) return;
    updateSeatForEvent(eventId, seatId, { isAda: !seat.isAda });
    refreshSeats();
  };

  const onRegisterSeat = (seatId) => {
    const ownerUid = prompt('Enter owner UID to register this seat for:');
    if (!ownerUid) return;
    try {
      assignSeats(eventId, [seatId], ownerUid);
      alert('Seat registered');
    } catch (e) {
      alert('Failed to register seat: ' + e.message);
    }
  };

  // Seats already taken for this event (Set of seatIds)
  const taken = useMemo(() => getAssignedSeats(eventId), [eventId]);

  // User’s current selections (array of seatIds)
  const [selected, setSelected] = useState([]);

  if (!ev) {
    return <div className="p-6 mt-12">Event not found.</div>;
  }

  const toggleSeat = (seatId) => {
    // Guard: do nothing if seat is already taken
    if (taken.has(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const priceEach = ev.basePrice;
  const studentDiscount = 0.2; // 20% demo discount (applied in checkout)
  const subtotal = selected.length * priceEach;

  const proceed = () => {
    // Save a "pending order" before navigating to checkout
    const pending = {
      eventId: ev.id,
      eventTitle: ev.title,
      startTime: ev.startTime,
      seats: selected,          // array of seatIds
      priceEach,                // base price
      subtotal,                 // before discount; checkout will apply studentDiscount
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem("pendingOrder", JSON.stringify(pending));
    } catch {
      // best effort; if localStorage fails, still attempt navigation
    }

    navigate("/checkout");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12" style={{position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'#fff',borderRadius:'1.5rem',zIndex:0,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}></div>
      <div style={{position:'relative',zIndex:1}}>
  {/* Header */}
  <div className="mb-6">
        <button
          onClick={() => navigate("/events")}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          ← Back to Events
        </button>
        <h1 className="text-2xl font-semibold mt-2">{ev.title}</h1>
        <div className="text-sm text-gray-500">
          {new Date(ev.startTime).toLocaleString()} • {ev.venueId}
        </div>

      {/* Seating legend */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-white" /> Available
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-gray-200" /> Taken
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-yellow-100" /> Selected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-blue-50" /> ADA
        </span>
      </div>

      {/* Seats grid */}
        {/* Seats grid with white backdrop */}
        <div className="mb-10" style={{position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'#fff',borderRadius:'1rem',zIndex:0,boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}></div>
          <div className="grid grid-cols-4 gap-4" style={{position:'relative',zIndex:1}}>
        {seats.map((seat) => {
          const isTaken = taken.has(seat.id);
          const isSelected = selected.includes(seat.id);
          return (
            <button
              key={seat.id}
              disabled={isTaken}
              onClick={() => toggleSeat(seat.id)}
              className={[
                "px-4 py-3 rounded-lg border text-base transition-colors mb-2",
                isTaken
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "hover:bg-red-100",
                isSelected ? "ring-2 ring-red-700 bg-yellow-100" : "",
                seat.isAda ? "bg-red-50" : "",
              ].join(" ")}
              aria-label={`Seat ${seat.label}${seat.isAda ? " (ADA)" : ""}${
                isTaken ? " (Taken)" : ""
              }`}
            >
              {seat.label}
            </button>
          );
        })}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-card">
          <h3 className="text-xl font-bold mb-4">Admin: Manage Seats</h3>
          <form onSubmit={onAddSeat} className="flex gap-4 mb-6">
            <input name="id" placeholder="Seat ID (e.g. D1)" className="px-3 py-2 rounded text-black bg-white" />
            <input name="label" placeholder="Label (optional)" className="px-3 py-2 rounded text-black bg-white" />
            <label className="flex items-center gap-2"><input type="checkbox" name="isAda" /> ADA</label>
            <button className="admin-btn">Add seat</button>
          </form>
          <div className="space-y-3">
            {adminSeats.map(s => (
              <div key={s.id} className="flex items-center justify-between border rounded p-3 mb-2 bg-red-50">
                <div>
                  <div className="font-medium text-lg text-black">{s.label} ({s.id}) {s.isAda ? '• ADA' : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleAda(s.id)} className="admin-btn" style={{backgroundColor:'#991b1b'}}>Toggle ADA</button>
                  <button onClick={() => onRegisterSeat(s.id)} className="admin-btn" style={{backgroundColor:'#991b1b'}}>Register</button>
                  <button onClick={() => onRemoveSeat(s.id)} className="admin-btn" style={{backgroundColor:'#991b1b'}}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* Summary / actions */}
  <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <div>Price each: ${priceEach.toFixed(2)}</div>
          <div>Seats selected: {selected.length}</div>
          <div>
            Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-500">
            (Student demo discount {Math.round(studentDiscount * 100)}% is applied at
            checkout)
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className={`px-4 py-2 rounded-xl border ${
              selected.length === 0
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            Clear
          </button>

          <button
            disabled={selected.length === 0}
            onClick={proceed}
            className={`px-4 py-2 rounded-xl ${
              selected.length
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
