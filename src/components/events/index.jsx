import React from "react";
import { Link } from "react-router-dom";
import { EVENTS } from "../../data/events";

export default function Events() {
  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      <h1 className="text-2xl font-semibold mb-4">TD Arena Events</h1>
      <ul className="space-y-3">
        {EVENTS.map(ev => (
          <li key={ev.id} className="border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{ev.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(ev.startTime).toLocaleString()} • {ev.venueId}
              </div>
            </div>
            <Link
              to={`/events/${ev.id}`}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              View seats
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
