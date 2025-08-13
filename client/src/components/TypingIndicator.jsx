// src/components/TypingIndicator.jsx
import React from "react";

export default function TypingIndicator({ typingUsers }) {
  if (typingUsers.length === 0) return null;
  return (
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-sm text-gray-500 font-medium flex flex-col items-center z-50">
      {typingUsers.map((name, i) => (
        <div key={`${name}-${i}`} className="animate-pulse">
          ✍️ {name} is typing...
        </div>
      ))}
    </div>
  );
}
