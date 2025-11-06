import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getEvents, addEvent, removeEvent } from "../../data/events";
import { useAuth } from "../../contexts/authContext";
import InteractiveSeatingChart from "../seating-chart";

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChartForEvent, setShowChartForEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const eventsData = await getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value.trim();
    const startTime = form.startTime.value;
    const venueId = form.venueId.value.trim();
    const basePrice = Number(form.basePrice.value) || 0;
    if (!title || !startTime) return;
    
    try {
      const newEv = { title, startTime, venueId, basePrice };
      await addEvent(newEv);
      await loadEvents();
      form.reset();
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to add event. Please try again.");
    }
  };

  // eslint-disable-next-line no-restricted-globals
  const onRemove = async (eventId) => {
    if (!window.confirm('Remove this event?')) return;
    try {
      await removeEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error("Error removing event:", error);
      alert("Failed to remove event. Please try again.");
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 mt-12">Loading events...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      <h1 className="text-2xl font-semibold mb-8">TD Arena Events</h1>

      {isAdmin && (
        <div className="admin-card">
          <h2 className="text-xl font-bold mb-4">Admin: Add or Remove Events</h2>
          <form onSubmit={onAdd} className="grid grid-cols-2 gap-4 mb-6">
            <input name="title" placeholder="Title" className="px-3 py-2 rounded text-black bg-white col-span-2" />
            <input name="startTime" type="datetime-local" className="px-3 py-2 rounded text-black bg-white" />
            <input name="venueId" placeholder="Venue" className="px-3 py-2 rounded text-black bg-white" />
            <input name="basePrice" placeholder="Base price" type="number" className="px-3 py-2 rounded text-black bg-white col-span-2" />
            <button type="submit" className="admin-btn col-span-2" style={{backgroundColor:'#7c3aed'}}>Add Event</button>
          </form>
          <div className="text-sm mb-2">Remove events using the button next to each event below.</div>
        </div>
      )}

      <ul className="space-y-6">
        {events.map(ev => (
          <li key={ev.id} className="border rounded-xl p-6 app-card mb-6" style={{background:'#fff1c9'}}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-medium text-lg mb-2">{ev.title}</div>
                <div className="text-sm text-gray-500 mb-2">
                  {new Date(ev.startTime).toLocaleString()} • {ev.venueId}
                </div>
                <div className="text-sm text-gray-700">Price: ${ev.basePrice}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChartForEvent(showChartForEvent === ev.id ? null : ev.id)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700"
                >
                  {showChartForEvent === ev.id ? 'Hide Chart' : 'View Chart'}
                </button>
                <Link
                  to={`/events/${ev.id}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  View seats
                </Link>
                {isAdmin && (
                  <button onClick={() => onRemove(ev.id)} className="admin-btn" style={{backgroundColor:'#991b1b'}}>Remove</button>
                )}
              </div>
            </div>
            
            {/* Interactive Seating Chart */}
            {showChartForEvent === ev.id && (
              <div className="mt-6 pt-6 border-t">
                <InteractiveSeatingChart eventId={ev.id} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
