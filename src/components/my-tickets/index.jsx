import React, { useEffect, useState } from "react";
import { releaseSeat } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";
import { getTicketsForUserFromDB, deleteTicketFromDB, getEventByIdFromDB, invalidateTicketsForEventInDB } from "../../firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import Loading from "../common/Loading";

export default function MyTickets() {
  const { currentUser } = useAuth();
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [invalidEventIds, setInvalidEventIds] = useState(new Set());

  // Load tickets from Firestore for the logged-in user
  useEffect(() => {
    const loadTickets = async () => {
      if (currentUser?.uid) {
        try {
          const userTickets = await getTicketsForUserFromDB(currentUser.uid);
          setTickets(userTickets);

          // Check whether the referenced event documents still exist.
          const uniqueEventIds = Array.from(new Set(userTickets.map(t => t.eventId).filter(Boolean)));
          if (uniqueEventIds.length) {
            const results = await Promise.all(uniqueEventIds.map(async (eid) => ({
              id: eid,
              exists: !!(await getEventByIdFromDB(eid))
            })));
            const missing = results.filter(r => !r.exists).map(r => r.id);
            if (missing.length) {
              // Mark as invalid in UI immediately
              setInvalidEventIds(new Set(missing));
              // Retroactively mark all tickets for these events as invalid in Firestore
              await Promise.all(missing.map(eid => invalidateTicketsForEventInDB(eid)));
              // Reload to reflect updated ticket statuses
              const refreshed = await getTicketsForUserFromDB(currentUser.uid);
              setTickets(refreshed);
            }
          }
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
    return <Loading />;
  }
  
  const removeTicket = async (ticketId) => {
    const t = tickets.find(x => x.id === ticketId);

    if (t) {
      // Try to remove the ticket, but only show an alert if the ticket is not actually removed
      let removed = false;
      try {
        // Free the seat only if this user owns it
        removed = await releaseSeat(t.eventId, t.seatId, currentUser?.uid || null);
      } catch (error) {
        // If releaseSeat throws, removed will be false
        removed = false;
      }
      if (removed) {
        window.location.reload();
      } else {
        alert('Failed to remove ticket');
      }
    }
  };

  if (!currentUser?.uid) {  //guests can't see tickets
    return (
      <div className="max-w-3xl mx-auto p-6 mt-12">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-2xl p-12 shadow-lg text-center">
          <p className="text-xl text-gray-600">Please log in to register and view your tickets</p>
        </div>
      </div>
    );
  }
  if (!tickets.length) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-12">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-2xl p-12 shadow-lg text-center">
          <p className="text-xl text-gray-600">You do not have any tickets</p>
        </div>
      </div>
    );
  }

  // Group tickets by event
  const ticketsByEvent = tickets.reduce((acc, ticket) => {
    const eventKey = ticket.eventId;
    if (!acc[eventKey]) {
      acc[eventKey] = {
        eventTitle: ticket.eventTitle,
        startTime: ticket.startTime,
        endTime: ticket.endTime || null,
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
    // Consistent maroon color scheme for all events
    const colors = { 
      gradient: 'from-red-900 to-red-800', 
      ticketBg: 'from-red-50 to-rose-50', 
      seatBg: 'bg-red-100', 
      seatText: 'text-red-900' 
    };
    
    return (
    <div key={eventId} className="mb-8">
      {/* Event Header with maroon color */}
      <div className={`mb-4 p-4 bg-gradient-to-r ${colors.gradient} rounded-xl text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-90 mb-1">Event</div>
            <h2 className="text-xl font-bold">{eventData.eventTitle}</h2>
            <div className="text-sm opacity-90 mt-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(eventData.startTime).toLocaleString()} {eventData.endTime ? `- ${new Date(eventData.endTime).toLocaleString()}` : ''}
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
                {(() => {
                  const isInvalid = t.status === 'Invalid' || !!t.invalidReason || invalidEventIds.has(t.eventId);
                  const label = isInvalid ? `Invalid - ${t.invalidReason || 'The Event has been cancelled'}` : (t.status || 'Issued');
                  const classes = isInvalid ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                  return (
                    <div className={`px-3 py-1 ${classes} text-xs font-semibold rounded-full`}>{label}</div>
                  );
                })()}
              </div>
            </div>
            
            {/* QR Code Section */}
            <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="font-semibold mb-2">QR Code</div>
              <div className="flex items-center justify-center">
                <QRCodeCanvas value={t.qrPayload || ''} size={160} includeMargin={true} />
              </div>
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
