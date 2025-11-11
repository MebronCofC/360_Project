import React from "react";
import { useNavigate } from "react-router-dom";

export default function InteractiveSeatingChart({ eventId }) {
  const navigate = useNavigate();

  const handleSectionClick = (sectionNumber) => {
    // Navigate to event detail page with section parameter
    navigate(`/events/${eventId}?section=${sectionNumber}`);
  };

  // Define all sections with their approximate positions (percentages)
  const sections = [
    // Top row
    { number: 210, left: '20%', top: '3%', width: '8%', height: '9%' },
    { number: 211, left: '30%', top: '3%', width: '12%', height: '9%' },
    { label: "SUITE", left: '44%', top: '3%', width: '12%', height: '5%', special: true },
    { number: 213, left: '58%', top: '3%', width: '12%', height: '9%' },
    { number: 214, left: '72%', top: '3%', width: '8%', height: '9%' },
    
    // Left side
    { number: 209, left: '2%', top: '27%', width: '6%', height: '9%' },
    { number: 208, left: '2%', top: '51%', width: '6%', height: '9%' },
    { number: 207, left: '2%', top: '72%', width: '6%', height: '9%' },
    
    // Upper left sections
    { number: 110, left: '10%', top: '14%', width: '14%', height: '15%' },
    { number: 109, left: '10%', top: '33%', width: '14%', height: '15%' },
    { number: 107, left: '10%', top: '52%', width: '14%', height: '15%' },
    { number: 106, left: '10%', top: '71%', width: '14%', height: '15%' },
    
    // Upper center sections
    { number: 111, left: '26%', top: '14%', width: '10%', height: '15%' },
    { number: 112, left: '38%', top: '14%', width: '10%', height: '15%' },
    { number: 113, left: '50%', top: '14%', width: '10%', height: '15%' },
    { number: 114, left: '62%', top: '14%', width: '12%', height: '15%' },
    
    // Right side sections
    { number: 115, left: '76%', top: '14%', width: '14%', height: '15%' },
    { number: 101, left: '76%', top: '43%', width: '14%', height: '15%' },
    
    // Right edge
    { number: 215, left: '92%', top: '27%', width: '6%', height: '9%' },
    { number: 216, left: '92%', top: '51%', width: '6%', height: '9%' },
    { number: 201, left: '92%', top: '72%', width: '6%', height: '9%' },
    
    // Bottom center sections
    { number: 105, left: '26%', top: '71%', width: '10%', height: '15%' },
    { number: 104, left: '38%', top: '71%', width: '10%', height: '15%' },
    { number: 103, left: '50%', top: '71%', width: '10%', height: '15%' },
    { number: 102, left: '62%', top: '71%', width: '12%', height: '15%' },
    
    // Bottom row
    { number: 206, left: '20%', top: '89%', width: '8%', height: '9%' },
    { number: 205, left: '30%', top: '89%', width: '12%', height: '9%' },
    { number: 204, left: '44%', top: '89%', width: '12%', height: '9%' },
    { number: 203, left: '58%', top: '89%', width: '12%', height: '9%' },
    { number: 202, left: '72%', top: '89%', width: '8%', height: '9%' },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Seating Chart Image */}
      <div className="relative">
        <img 
          src="/COFC_TD_ARENA_SeatingChart.webp" 
          alt="TD Arena Seating Chart" 
          className="w-full h-auto"
        />
        
        {/* Clickable Section Overlays with Purple Boxes */}
        {sections.map((section, idx) => (
          <button
            key={idx}
            onClick={() => handleSectionClick(section.number || section.label)}
            className="absolute bg-purple-600 bg-opacity-70 hover:bg-opacity-90 transition-all rounded cursor-pointer border-2 border-white flex items-center justify-center text-white font-bold hover:scale-110"
            style={{
              left: section.left,
              top: section.top,
              width: section.width,
              height: section.height,
              fontSize: section.special ? '0.6rem' : '0.8rem',
            }}
            title={section.special ? section.label : `Section ${section.number}`}
            aria-label={section.special ? section.label : `Click to select seats in section ${section.number}`}
          >
            {section.number || section.label}
          </button>
        ))}
      </div>

      {/* Hover Instructions */}
      <div className="text-center mt-4 text-sm text-gray-600">
        💡 Click any purple section number to view available seats
      </div>
    </div>
  );
}
