import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEventInventory } from "../../data/seatAssignments";

export default function InteractiveSeatingChart({ eventId }) {
  const navigate = useNavigate();
  const [soldOutSections, setSoldOutSections] = useState(new Set());
  const [unavailableSections, setUnavailableSections] = useState(new Set());

  // Load sold-out sections for this event so we can change labels on the chart
  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        if (!eventId) return;
        const inv = await getEventInventory(eventId);
        const so = new Set((inv?.soldOutSections || []).map(String));
        const fu = new Set((inv?.fullyUnavailableSections || []).map(String));
        if (!cancelled) {
          setSoldOutSections(so);
          setUnavailableSections(fu);
        }
      } catch (e) {
        console.error("Failed to load inventory for seating chart", e);
      }
    }
    loadInventory();
    return () => { cancelled = true; };
  }, [eventId]);

  // Periodically refresh inventory so all users see updates in near real-time
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        if (!eventId || !active) return;
        const inv = await getEventInventory(eventId);
        if (!active) return;
        setSoldOutSections(new Set((inv?.soldOutSections || []).map(String)));
        setUnavailableSections(new Set((inv?.fullyUnavailableSections || []).map(String)));
      } catch {}
    };
    const id = setInterval(tick, 3000);
    return () => { active = false; clearInterval(id); };
  }, [eventId]);

  const handleSectionClick = (sectionNumber) => {
    // Navigate to event detail page with section parameter
    navigate(`/events/${eventId}?section=${sectionNumber}`);
  };

  // Define all sections with their approximate positions (percentages)
  const sections = [
    // Top row
    { number: 210, left: '17%', top: '2%', width: '10%', height: '9%' },
    { number: 211, left: '29%', top: '2%', width: '13%', height: '9%' },
    { label: "SUITE", left: '41%', top: '3%', width: '18%', height: '5%', special: true },
    { number: 213, left: '58%', top: '2%', width: '13%', height: '9%' },
    { number: 214, left: '72%', top: '2%', width: '12%', height: '9%' },
    
    // Left side
    { number: 209, left: '0%', top: '17%', width: '7%', height: '20%' },
    { number: 208, left: '0%', top: '40%', width: '7%', height: '20%' },
    { number: 207, left: '0%', top: '63%', width: '7%', height: '20%' },
    
    // Upper left sections
    { number: 110, left: '13%', top: '14%', width: '14%', height: '15%' },
    { number: 109, left: '10%', top: '33%', width: '14%', height: '15%' },
    { number: 107, left: '10%', top: '52%', width: '14%', height: '15%' },
    { number: 106, left: '14%', top: '71%', width: '14%', height: '15%' },
    
    // Upper center sections
    { number: 111, left: '30%', top: '14%', width: '13%', height: '15%' },
    { number: 112, left: '44%', top: '14%', width: '13%', height: '15%' },
    { number: 113, left: '58%', top: '14%', width: '13%', height: '15%' },
    { number: 114, left: '72%', top: '14%', width: '13%', height: '15%' },
    
    // Right side sections
    { number: 115, left: '73%', top: '34%', width: '18%', height: '15%' },
    { number: 101, left: '73%', top: '52%', width: '18%', height: '15%' },
    
    // Right edge
    { number: 215, left: '93%', top: '18%', width: '7%', height: '20%' },
    { number: 216, left: '93%', top: '40%', width: '7%', height: '20%' },
    { number: 201, left: '93%', top: '62%', width: '7%', height: '20%' },
    
    // Bottom center sections
    { number: 105, left: '30%', top: '70%', width: '12%', height: '20%' },
    { number: 104, left: '44%', top: '70%', width: '12%', height: '20%' },
    { number: 103, left: '58%', top: '70%', width: '12%', height: '20%' },
    { number: 102, left: '72%', top: '70%', width: '12%', height: '20%' },

    // Bottom row
    { number: 206, left: '15%', top: '90%', width: '12%', height: '10%' },
    { number: 205, left: '29%', top: '90%', width: '13%', height: '9%' },
    { number: 204, left: '43%', top: '90%', width: '14%', height: '9%' },
    { number: 203, left: '58%', top: '90%', width: '13%', height: '9%' },
    { number: 202, left: '72%', top: '90%', width: '15%', height: '9%' },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Instruction text above chart */}
      <div className="text-center mb-4 text-sm text-gray-700 font-semibold">
        💡 Click any purple section number to view available seats 💡
      </div>
      {/* Seating Chart Image */}
      <div className="relative">
        <img 
          src="/COFC_TD_ARENA_SeatingChart.webp" 
          alt="TD Arena Seating Chart" 
          className="w-full h-auto"
        />
        
        {/* Clickable Section Overlays with Purple Boxes */}
        {sections.map((section, idx) => {
          const sectionId = String(section.number || section.label);
          const isFullyUnavailable = unavailableSections.has(sectionId);
          const isSoldOut = soldOutSections.has(sectionId);
          let label = section.number || section.label;
          if (isFullyUnavailable || isSoldOut) label = "No More Seats Available";
          return (
            <button
              key={idx}
              onClick={() => (!isSoldOut && !isFullyUnavailable) && handleSectionClick(section.number || section.label)}
              disabled={isSoldOut || isFullyUnavailable}
              className={`absolute transition-all rounded border-2 border-white flex items-center justify-center font-bold hover:scale-110 
                ${isFullyUnavailable ? 'bg-gray-500 bg-opacity-90 cursor-not-allowed text-white' : isSoldOut ? 'bg-gray-400 bg-opacity-90 cursor-not-allowed text-gray-900' : 'bg-purple-600 bg-opacity-70 hover:bg-opacity-90 cursor-pointer text-white'}`}
              style={{
                left: section.left,
                top: section.top,
                width: section.width,
                height: section.height,
                fontSize: (isSoldOut || isFullyUnavailable) ? '0.62rem' : (section.special ? '0.6rem' : '0.8rem'),
                textAlign: 'center',
                padding: '4px'
              }}
              title={isFullyUnavailable ? 'Seats are unavailable' : isSoldOut ? 'No More Seats Available' : (section.special ? section.label : `Section ${section.number}`)}
              aria-label={isFullyUnavailable ? 'This section has been marked unavailable' : isSoldOut ? 'This section is sold out' : (section.special ? section.label : `Click to select seats in section ${section.number}`)}
            >
              {label}
            </button>
          );
        })}
      </div>

      
    </div>
  );
}
