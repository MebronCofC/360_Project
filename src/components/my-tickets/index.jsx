import React, { useEffect, useState } from "react";
import { releaseSeat } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";

export default function MyTickets() {
  const { currentUser } = useAuth?.() || { currentUser: null };
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [tickets, setTickets] = useState([]);

  // Load & filter tickets for the logged-in user
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("tickets") || "[]");
      if (currentUser?.uid) {
        setTickets(all.filter(t => t.userId === currentUser.uid));
      } else {
        setTickets([]); // hide when logged out
      }
    } catch {
      setTickets([]);
    }
  }, [currentUser?.uid]);
  
  const removeTicket = (ticketId) => {
  
    const all = JSON.parse(localStorage.getItem("tickets") || "[]");
    const t = all.find(x => x.id === ticketId);

    if (t) {
      // Free the seat only if this user owns it
      releaseSeat(t.eventId, t.seatId, currentUser?.uid || null);
    }

    const remaining = all.filter(x => x.id !== ticketId);
    localStorage.setItem("tickets", JSON.stringify(remaining));

    // Update local state to reflect removal immediately
    setTickets(prev => prev.filter(x => x.id !== ticketId));

    // Also do a quick page refresh so nothing "lingers" visually
    window.location.reload();
  };


  if (!tickets.length) {
    return <div className="max-w-3xl mx-auto p-6 mt-12">No tickets yet.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-12 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">My Tickets</h1>
      
      {/* Confirmation Dialog */}
      {deletingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Remove Ticket</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to remove this ticket? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingTicket(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeTicket(deletingTicket);
                  setDeletingTicket(null);
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {tickets.map(t => (
          <div key={t.id} className="border rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium">{t.eventTitle}</div>
                <div className="text-gray-600 text-sm mb-2">{new Date(t.startTime).toLocaleString()}</div>
                <div className="text-sm">Seat: <span className="font-medium">{t.seatId}</span></div>
              </div>
              <button
                onClick={() => setDeletingTicket(t.id)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="text-xs text-gray-500 break-all mt-2">QR payload: {t.qrPayload}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
