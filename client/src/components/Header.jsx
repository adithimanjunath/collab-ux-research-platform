import React, { useMemo } from "react";

export default function Header({ onlineUsers = [], user, onLeave, onToggleGrid }) {
  // Detect duplicate names and mark collisions
  const processedUsers = useMemo(() => {
    const nameCounts = onlineUsers.reduce((acc, u) => {
      const name = u?.name || u?.email || "User";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return onlineUsers.map((u) => {
      const name = u?.name || u?.email || "User";
      const collision = nameCounts[name] > 1;
      return {
        ...u,
        displayName: collision
          ? `${name} (${u?.email || u?.uid?.slice(0, 5)})`
          : name,
      };
    });
  }, [onlineUsers]);

  return (
    <div className="absolute top-4 right-4 z-50 bg-white border border-gray-200 shadow-md rounded-full px-4 py-2 flex items-center justify-between min-w-[280px]">
      {/* Leave Button */}
      <button
        type="button"
        onClick={onLeave}
        className="text-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-full shadow-sm"
      >
        Leave Board
      </button>
            <button
        type="button"
        onClick={onToggleGrid}
        className="text-sm bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded-full shadow-sm ml-2"
      >
        Toggle Grid
      </button>

      {/* Online Users List */}
      <div className="ml-6 max-h-28 overflow-auto">
        <div className="text-xs font-medium text-gray-700 mb-1">Online Users:</div>
        <ul className="text-xs text-gray-700 space-y-1">
          {processedUsers.length === 0 && <li>No users online</li>}
          {processedUsers.map((u) => (
            <li key={u.uid} className="truncate">
              {u.displayName}
            </li>
          ))}
        </ul>
      </div>

      {/* Current logged-in user */}
      {user && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-500">
          Logged in as{" "}
          <strong>{user.displayName || user.email || "User"}</strong>
        </div>
      )}
    </div>
  );
}
