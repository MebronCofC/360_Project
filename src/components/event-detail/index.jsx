import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  EVENTS,
  seatsForEvent,
  getSeatsForEvent,
  addSeatToEvent,
  removeSeatFromEvent,
  updateSeatForEvent,
} from "../../data/events";
import { getAssignedSeats, assignSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";

export default function EventDetail() {
  const { eventId, sectionId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth() || {};

  // Find event
  const event = useMemo(
    () => EVENTS.find((e) => e.id === eventId),
    [eventId]
  );

  // Load seats from storage (if admin changed them) or base definition
  const allSeats = useMemo(() => {
    const stored = getSeatsForEvent
      ? getSeatsForEvent(eventId)
      : null;
    const base = seatsForEvent(eventId);
    return stored && stored.length ? stored : base;
  }, [eventId]);

  // Optional: filter by section (A/B/C) when coming from section-select
  const seats = useMemo(() => {
    if (!sectionId) return allSeats;
    return allSeats.filter((s) => s.id.startsWith(sectionId));
  }, [allSeats, sectionId]);

  // Taken seats for this event
  const takenSet = useMemo(() => {
    const taken = getAssignedSeats(eventId) || {};
    // getAssignedSeats returns a map or set; normalize to Set of ids
    if (taken instanceof Set) return taken;
    if (Array.isArray(taken)) return new Set(taken);
    return new Set(Object.keys(taken));
  }, [eventId]);

  const [selected, setSelected] = useState([]);

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-gray-600">Event not found.</p>
        <button
          onClick={() => navigate("/events")}
          className="mt-4 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const priceEach = event.basePrice || 20;
  const subtotal = selected.length * priceEach;

  const toggleSeat = (seatId) => {
    if (takenSet.has(seatId)) return; // can't pick taken seats
    setSelected((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  const clearSelected = () => setSelected([]);

  const proceed = () => {
    if (!selected.length) return;

    // For the prototype, assign immediately and send user to checkout / my-tickets.
    const ownerUid = currentUser?.uid || "demo-user";

    assignSeats(eventId, selected, ownerUid);

    // In a full flow you might navigate to /checkout with state.
    // For now, go to My Tickets so they can see what they "bought".
    navigate("/my-tickets");
  };

  // ----- Admin helpers -----
  const [adminForm, setAdminForm] = useState({ id: "", label: "", isAda: false });

  const onAdminChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onAddSeat = (e) => {
    e.preventDefault();
    if (!adminForm.id) return;
    addSeatToEvent(eventId, {
      id: adminForm.id,
      label: adminForm.label || adminForm.id,
      isAda: !!adminForm.isAda,
    });
    setAdminForm({ id: "", label: "", isAda: false });
    window.location.reload(); // simple refresh for prototype
  };

  const onRemoveSeat = (seatId) => {
    removeSeatFromEvent(eventId, seatId);
    window.location.reload();
  };

  const onToggleAda = (seatId) => {
    updateSeatForEvent(eventId, seatId, (prev) => ({
      isAda: !prev.isAda,
    }));
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Event header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/events")}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to Events
        </button>
        <h1 className="text-2xl font-semibold mt-2">{event.title}</h1>
        <p className="text-sm text-gray-500">
          TD Arena • {new Date(event.startTime).toLocaleString()}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center text-xs text-gray-600 mb-4">
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 inline-block rounded border bg-gray-200" />
          Taken
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 inline-block rounded border bg-yellow-100" />
          Selected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 inline-block rounded border bg-blue-50" />
          ADA
        </span>
      </div>

      {/* Seats grid */}
      <div className="mb-8">
        <div
          className="mb-3 text-xs text-gray-500 uppercase tracking-wide"
        >
          Choose your seats
          {sectionId && (
            <span className="ml-2 text-indigo-600 font-medium">
              (Section {sectionId})
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {seats.map((seat) => {
            const isTaken = takenSet.has(seat.id);
            const isSelected = selected.includes(seat.id);

            let base =
              "px-3 py-2 rounded-lg text-sm border transition shadow-sm";

            if (isTaken) {
              base +=
                " bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed";
            } else if (isSelected) {
              base +=
                " bg-yellow-100 border-yellow-400 text-yellow-900 font-semibold";
            } else if (seat.isAda) {
              base +=
                " bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100";
            } else {
              base +=
                " bg-white border-gray-200 hover:bg-gray-50 hover:border-indigo-400";
            }

            return (
              <button
                key={seat.id}
                onClick={() => toggleSeat(seat.id)}
                disabled={isTaken}
                className={base}
                aria-label={`Seat ${seat.label}${
                  seat.isAda ? " (ADA)" : ""
                }${isTaken ? " (Taken)" : ""}`}
              >
                {seat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary + actions */}
      <div className="flex items-center justify-between gap-6">
        <div className="text-sm text-gray-700">
          <div>Price each: ${priceEach.toFixed(2)}</div>
          <div>Seats selected: {selected.length}</div>
          <div>
            Subtotal:{" "}
            <span className="font-semibold">
              ${subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearSelected}
            disabled={selected.length === 0}
            className={`px-4 py-2 rounded-xl border text-sm ${
              selected.length === 0
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            Clear
          </button>
          <button
            onClick={proceed}
            disabled={selected.length === 0}
            className={`px-4 py-2 rounded-xl text-sm ${
              selected.length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            Continue
          </button>
        </div>
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">
            Admin: Manage Seats
          </h2>
          <form
            onSubmit={onAddSeat}
            className="flex flex-wrap items-center gap-3 mb-4"
          >
            <input
              name="id"
              value={adminForm.id}
              onChange={onAdminChange}
              placeholder="Seat ID (e.g. D1)"
              className="px-3 py-2 rounded border text-sm"
            />
            <input
              name="label"
              value={adminForm.label}
              onChange={onAdminChange}
              placeholder="Label (optional)"
              className="px-3 py-2 rounded border text-sm"
            />
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="isAda"
                checked={adminForm.isAda}
                onChange={onAdminChange}
              />
              ADA
            </label>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
            >
              Add seat
            </button>
          </form>

          <div className="grid gap-2 text-xs">
            {allSeats.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2 rounded border bg-gray-50"
              >
                <div>
                  <div className="font-medium">
                    {s.label} ({s.id}){" "}
                    {s.isAda && (
                      <span className="text-blue-700">
                        • ADA
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleAda(s.id)}
                    className="px-2 py-1 rounded bg-white border text-[10px] hover:bg-gray-100"
                  >
                    Toggle ADA
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(s.id)}
                    className="px-2 py-1 rounded bg-red-600 text-white text-[10px] hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
