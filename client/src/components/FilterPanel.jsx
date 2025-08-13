// src/components/FilterPanel.jsx
import React from "react";

export default function FilterPanel({ filter, onToggle }) {
  const types = ["note", "idea", "issue", "research"];
  return (
    <div className="fixed top-[100px] left-8 z-40 w-40 p-5 bg-gray-100 border border-gray-300 rounded shadow-md space-y-2 text-sm">
      <p className="font-medium text-gray-700 mb-2">Filter data by</p>
      {types.map((type) => (
        <label key={type} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filter[type]}
            onChange={() => onToggle(type)}
          />
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </label>
      ))}
    </div>
  );
}
