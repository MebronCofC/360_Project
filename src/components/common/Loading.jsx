import React from 'react';

export default function Loading({ message = "Loading" }) {
  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-2xl p-12 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-4">
          <img 
            src="/CofC_Logo.png" 
            alt="College of Charleston" 
            className="w-[225px] h-auto animate-pulse"
          />
          <p className="text-gray-600 text-lg">{message}</p>
        </div>
      </div>
    </div>
  );
}
