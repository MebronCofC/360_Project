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

      
    </div>
  );
}
