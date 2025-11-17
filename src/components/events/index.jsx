import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import { getEvents, addEvent, removeEvent, updateEvent } from "../../data/events";
import { useAuth } from "../../contexts/authContext";
import InteractiveSeatingChart from "../seating-chart";
import { deleteAllTicketsForEventFromDB } from "../../firebase/firestore";
import Loading from "../common/Loading";

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChartForEvent, setShowChartForEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return; // Prevent double submission
    
    const form = e.target;
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const startTime = form.startTime.value;
    const endTime = form.endTime.value;
    const venueId = form.venueId.value.trim();
    const basePrice = Number(form.basePrice.value) || 0;
    if (!title || !startTime || !endTime) {
      alert("Please provide title, start time, and end time.");
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      alert("End time must be after start time.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newEv = { title, description, startTime, endTime, venueId, basePrice };
      await addEvent(newEv);
      await loadEvents();
      form.reset();
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to add event. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  const onEdit = (event) => {
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startTime: event.startTime,
      endTime: event.endTime,
      venueId: event.venueId,
      basePrice: event.basePrice
    });
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    const form = e.target;
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const startTime = form.startTime.value;
    const endTime = form.endTime.value;
    const venueId = form.venueId.value.trim();
    const basePrice = Number(form.basePrice.value) || 0;
    if (!title || !startTime || !endTime) {
      alert("Please provide title, start time, and end time.");
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      alert("End time must be after start time.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateEvent(editingEvent.id, { title, description, startTime, endTime, venueId, basePrice });
      await loadEvents();
      setEditingEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteAllTickets = async (eventId, eventTitle) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`Delete ALL tickets for "${eventTitle}"? This cannot be undone.`)) return;
    
    try {
      console.log("Admin requesting deletion of all tickets for event:", eventId);
      const result = await deleteAllTicketsForEventFromDB(eventId);
      console.log("Deletion result:", result);
      
      if (result.deleted === 0) {
        alert("No tickets found to delete for this event.");
      } else {
        alert(`Successfully deleted ${result.deleted} ticket(s) for this event.`);
      }
      
      await loadEvents();
    } catch (error) {
      console.error("Error deleting all tickets:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Show more specific error message
      let errorMsg = "Failed to delete tickets. ";
      if (error.code === 'permission-denied') {
        errorMsg += "Permission denied. Make sure you're logged in as an admin.";
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += "Please check the console for details.";
      }
      
      alert(errorMsg);
    }
  };

  if (loading) {
    return <Loading message="Loading events" />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      <div className="bg-white border border-gray-300 rounded-2xl p-6">
      <h1 className="text-2xl font-semibold mb-8 bg-white border border-gray-300 rounded-lg px-6 py-4">TD Arena Events</h1>

      {isAdmin && (
        <div className="admin-card">
          <h2 className="text-xl font-bold mb-4 text-black">Admin: Add or Remove Events</h2>
          <form onSubmit={onAdd} className="grid grid-cols-2 gap-2 mb-6">
            <input name="title" placeholder="Title" className="px-3 py-2 rounded text-black bg-white col-span-2" />
            <textarea name="description" placeholder="Description (optional)" className="px-3 py-2 rounded text-black bg-white col-span-2 resize-y min-h-[80px]" />
            <input name="startTime" type="datetime-local" className="px-3 py-2 rounded text-black bg-white" />
            <input name="endTime" type="datetime-local" className="px-3 py-2 rounded text-black bg-white" />
            <input name="venueId" placeholder="Venue" className="px-3 py-2 rounded text-black bg-white col-span-2" />
            <input name="basePrice" placeholder="Base price" type="number" className="px-3 py-2 rounded text-black bg-white col-span-2" />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="admin-btn col-span-2" 
              style={{backgroundColor: isSubmitting ? '#a78bfa' : '#7c3aed', cursor: isSubmitting ? 'not-allowed' : 'pointer'}}
            >
              {isSubmitting ? 'Adding...' : 'Add Event'}
            </button>
          </form>
          <div className="text-sm mb-2 text-black">Remove events using the button next to each event below.</div>
        </div>
      )}

      <ul className="space-y-6">
        {events.map(ev => (
          <li key={ev.id} className="border rounded-xl p-6 app-card mb-6" style={{background:'#ffffffff'}}>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-lg mb-2">{ev.title}</div>
                {ev.description && (
                  <div className="text-sm text-gray-600 mb-2 italic leading-5">
                    {ev.description}
                  </div>
                )}
                <div className="text-sm text-gray-500 mb-2">
                  {new Date(ev.startTime).toLocaleString()} - {new Date(ev.endTime).toLocaleString()} • {ev.venueId}
                </div>
                <div className="text-sm text-gray-700">Price: ${ev.basePrice}</div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0" style={{minWidth: '180px'}}>
                <button
                  onClick={() => setShowChartForEvent(showChartForEvent === ev.id ? null : ev.id)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 whitespace-nowrap w-full"
                >
                  {showChartForEvent === ev.id ? 'Hide Chart' : 'View Chart'}
                </button>
                {/* Removed redundant "View seats" button; use chart to select a section */}
                {isAdmin && (
                  <>
                    <button onClick={() => onEdit(ev)} className="admin-btn whitespace-nowrap w-full" style={{backgroundColor:'#7c3aed'}}>Edit</button>
                    <button onClick={() => onRemove(ev.id)} className="admin-btn whitespace-nowrap w-full" style={{backgroundColor:'#991b1b'}}>Remove</button>
                    <button 
                      onClick={() => onDeleteAllTickets(ev.id, ev.title)} 
                      className="admin-btn whitespace-nowrap w-full" 
                      style={{backgroundColor:'#dc2626'}}
                      title="Delete all tickets for this event"
                    >
                      Delete All Tickets
                    </button>
                  </>
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

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-black">Edit Event</h3>
            <form onSubmit={onSaveEdit} className="grid grid-cols-2 gap-4">
              <input 
                name="title" 
                defaultValue={editingEvent.title}
                placeholder="Title" 
                className="px-3 py-2 rounded text-black bg-gray-100 col-span-2" 
              />
              <textarea 
                name="description" 
                defaultValue={editingEvent.description}
                placeholder="Description (optional)" 
                className="px-3 py-2 rounded text-black bg-gray-100 col-span-2 resize-y min-h-[80px]" 
              />
              <input 
                name="startTime" 
                type="datetime-local" 
                defaultValue={editingEvent.startTime}
                className="px-3 py-2 rounded text-black bg-gray-100" 
              />
              <input 
                name="endTime" 
                type="datetime-local" 
                defaultValue={editingEvent.endTime}
                className="px-3 py-2 rounded text-black bg-gray-100" 
              />
              <input 
                name="venueId" 
                defaultValue={editingEvent.venueId}
                placeholder="Venue" 
                className="px-3 py-2 rounded text-black bg-gray-100 col-span-2" 
              />
              <input 
                name="basePrice" 
                defaultValue={editingEvent.basePrice}
                placeholder="Base price" 
                type="number" 
                className="px-3 py-2 rounded text-black bg-gray-100 col-span-2" 
              />
              <div className="col-span-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg"
                  style={{backgroundColor: isSubmitting ? '#a78bfa' : '', cursor: isSubmitting ? 'not-allowed' : 'pointer'}}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

