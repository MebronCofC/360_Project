import React, { useEffect, useState } from "react";
import { releaseSeat } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";
import { getTicketsForUserFromDB, deleteTicketFromDB } from "../../firebase/firestore";

export default function MyTickets() {
  const { currentUser } = useAuth();
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load tickets from Firestore for the logged-in user
  useEffect(() => {
    const loadTickets = async () => {
      if (currentUser?.uid) {
        try {
          const userTickets = await getTicketsForUserFromDB(currentUser.uid);
          setTickets(userTickets);
        } catch (error) {
          console.error('Error loading tickets:', error);
          setTickets([]);
        }
      } else {
        setTickets([]); // hide when logged out
      }
      setLoaded(true);
    };
    loadTickets();
  }, [currentUser?.uid]);

  if (!loaded) {
    return <div className="max-w-3xl mx-auto p-6 mt-12">Loading...</div>;
  }
  
  const removeTicket = async (ticketId) => {
    const t = tickets.find(x => x.id === ticketId);

    if (t) {
      try {
        // Free the seat only if this user owns it
        await releaseSeat(t.eventId, t.seatId, currentUser?.uid || null);
        
        // Delete ticket from Firestore
        await deleteTicketFromDB(ticketId);

        // Update local state to reflect removal immediately
        setTickets(prev => prev.filter(x => x.id !== ticketId));
      } catch (error) {
        console.error('Error removing ticket:', error);
        alert('Failed to remove ticket');
      }
    }
  };

  if (!currentUser?.uid) {  //guests can't see tickets
    return <div className="max-w-3xl mx-auto p-6 mt-12">Please log in to view your tickets.</div>;
  }
  if (!tickets.length) {
    return <div className="max-w-3xl mx-auto p-6 mt-12">No tickets yet.</div>;
  }

  // Group tickets by event
  const ticketsByEvent = tickets.reduce((acc, ticket) => {
    const eventKey = ticket.eventId;
    if (!acc[eventKey]) {
      acc[eventKey] = {
        eventTitle: ticket.eventTitle,
        startTime: ticket.startTime,
        tickets: []
      };
    }
    acc[eventKey].tickets.push(ticket);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto p-6 mt-12 space-y-6" style={{position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'#fff',borderRadius:'1.5rem',zIndex:0,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}></div>
      <div style={{position:'relative',zIndex:1}}>
  <h1 className="text-2xl font-semibold mb-4">My Tickets</h1>
  <div className="text-sm text-gray-600 mb-6">
    Total: {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} for {Object.keys(ticketsByEvent).length} event{Object.keys(ticketsByEvent).length !== 1 ? 's' : ''}
  </div>
      
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

  {/* Tickets Grouped by Event */}
  {Object.entries(ticketsByEvent).map(([eventId, eventData], index) => {
    // Alternate color schemes for different events
    const colorSchemes = [
      { gradient: 'from-indigo-600 to-purple-600', ticketBg: 'from-indigo-50 to-purple-50', seatBg: 'bg-indigo-100', seatText: 'text-indigo-700' },
      { gradient: 'from-pink-600 to-rose-600', ticketBg: 'from-pink-50 to-rose-50', seatBg: 'bg-pink-100', seatText: 'text-pink-700' },
      { gradient: 'from-blue-600 to-cyan-600', ticketBg: 'from-blue-50 to-cyan-50', seatBg: 'bg-blue-100', seatText: 'text-blue-700' },
      { gradient: 'from-green-600 to-emerald-600', ticketBg: 'from-green-50 to-emerald-50', seatBg: 'bg-green-100', seatText: 'text-green-700' },
      { gradient: 'from-orange-600 to-amber-600', ticketBg: 'from-orange-50 to-amber-50', seatBg: 'bg-orange-100', seatText: 'text-orange-700' },
    ];
    const colors = colorSchemes[index % colorSchemes.length];
    
    return (
    <div key={eventId} className="mb-8">
      {/* Event Header with unique color */}
      <div className={`mb-4 p-4 bg-gradient-to-r ${colors.gradient} rounded-xl text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-90 mb-1">Event</div>
            <h2 className="text-xl font-bold">{eventData.eventTitle}</h2>
            <div className="text-sm opacity-90 mt-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(eventData.startTime).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{eventData.tickets.length}</div>
            <div className="text-xs uppercase tracking-wider opacity-90">Ticket{eventData.tickets.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
      
      {/* Tickets for this event with matching color scheme */}
      <div className="grid md:grid-cols-2 gap-4">
        {eventData.tickets.map(t => (
          <div key={t.id} className={`border-2 rounded-xl p-5 bg-gradient-to-br ${colors.ticketBg} shadow-md hover:shadow-lg transition-shadow`}>
            {/* Ticket Details */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Seat</div>
                <div className={`px-3 py-1 ${colors.seatBg} ${colors.seatText} font-bold rounded-lg text-lg`}>{t.seatId}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Status</div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">{t.status || 'Issued'}</div>
              </div>
            </div>
            
            {/* QR Code Section */}
            <div className="mb-3 p-2 bg-gray-100 rounded text-xs text-gray-500 break-all">
              <div className="font-semibold mb-1">QR Code:</div>
              {t.qrPayload}
            </div>
            
            {/* Remove Button */}
            <button
              onClick={() => setDeletingTicket(t.id)}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors"
            >
              Remove Ticket
            </button>
          </div>
        ))}
      </div>
    </div>
  )})}
      </div>
    </div>
  );
}
