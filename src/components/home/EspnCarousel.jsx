import React, { useEffect, useState } from "react";

// Simple, dependency-free carousel that highlights ESPN links for CofC Men's Basketball
export default function EspnCarousel({ espnUrl }) {
  const slides = [
    {
      title: "Live Game Status",
      desc: "Tap to view live score, plays, and box score on ESPN.",
      cta: "Open ESPN",
    },
    {
      title: "Schedule & Results",
      desc: "See upcoming games and recent results.",
      cta: "View Schedule",
    },
    {
      title: "Team Stats & Leaders",
      desc: "Explore player leaders and team stats.",
      cta: "See Stats",
    },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-2xl p-4 shadow-lg w-80">
      <div className="flex items-center justify-start mb-2">
        <h2 className="text-lg font-bold text-gray-900">ESPN Live: CofC Men's Basketball</h2>
      </div>

      <div className="relative h-36 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 p-4 transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <div className="text-sm font-semibold text-gray-900 mb-1">{s.title}</div>
            <div className="text-xs text-gray-600 mb-3">{s.desc}</div>
            <a
              href={espnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-semibold px-3 py-1 rounded-md bg-red-700 text-white hover:bg-red-800"
            >
              {s.cta}
            </a>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? "bg-red-700 w-6" : "bg-gray-400/70 w-2"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />)
        )}
      </div>

      <div className="mt-3 text-[11px] text-gray-500">
        Data provided by ESPN. For the most up-to-date live details, open the ESPN page.
      </div>
    </div>
  );
}
