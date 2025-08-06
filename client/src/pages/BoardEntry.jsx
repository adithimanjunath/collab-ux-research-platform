import React, { useState,useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {auth} from "../firebase"; // Import auth for user info

function BoardEntry() {
  const [boardName, setBoardName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const navigate = useNavigate();

  const sanitizeBoardName = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

  useEffect(() => {
  if (!auth.currentUser) {
    navigate("/");
  }
}, [navigate]);

  const handleJoin = () => {
    if (!boardName ) return;

     const sanitizedBoard = sanitizeBoardName(boardName);
     const username = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
    
      navigate(`/${sanitizedBoard}`, {
      state: { username},
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
      <button
        onClick={handleJoin}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Join Board
      </button>
      <Link to="/" className="text-blue-500 px-6 py-2 rounded hover:underline"> Back</Link>
    </div>
  );
}

export default BoardEntry;
