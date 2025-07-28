import React, { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";

function BoardEntry() {
  const [boardName, setBoardName] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const sanitizeBoardName = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

  useEffect(() => {
  console.log("🚨 BoardEntry loaded!");
}, []);

  const handleJoin = () => {
    if (!boardName || !userName) return;
     const sanitizedBoard = sanitizeBoardName(boardName);
     console.log("🧪 boardName:", boardName);
     console.log("🧪 sanitizedBoard:", sanitizedBoard);
      navigate(`/${sanitizedBoard}`, {
      state: { username: userName.trim() }
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Enter Company / Board Name</h1>
      <input
        className="p-2 border rounded w-64"
        placeholder="e.g. acme-design"
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
      />
      <h1 className="text-2xl font-bold">Enter Your Name</h1>
      <input
        className="p-2 border rounded w-64"
        placeholder="e.g. Alice"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <button
        onClick={handleJoin}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Join Board
      </button>
    </div>
  );
}

export default BoardEntry;
