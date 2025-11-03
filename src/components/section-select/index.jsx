import React from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Simple section picker overlayed on the TD Arena seating chart image.
 * Clicking a section navigates to /events/:eventId/section/:sectionId
 */
export default function SectionSelect() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const go = (sectionId) => navigate(`/events/${eventId}/section/${sectionId}`);

  return (
    <div className="max-w-5xl mx-auto p-6 mt-12">
      <h1 className="text-2xl font-semibold mb-4">Choose a Section</h1>

      <div className="relative w-full">
        <img
          src="/COFC_TD_ARENA_SeatingChart.webp"
          alt="TD Arena seating"
          className="w-full h-auto rounded-md border"
        />

        {/* Overlay buttons - roughly positioned */}
        <button
          onClick={() => go("A")}
          className="absolute px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          style={{ top: "20%", left: "18%" }}
        >
          Section A
        </button>

        <button
          onClick={() => go("B")}
          className="absolute px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          style={{ top: "45%", left: "47%" }}
        >
          Section B
        </button>

        <button
          onClick={() => go("C")}
          className="absolute px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          style={{ top: "72%", left: "75%" }}
        >
          Section C
        </button>
      </div>
    </div>
  );
}
