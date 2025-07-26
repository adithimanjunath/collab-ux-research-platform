import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function BoardEntry() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const goToBoard = () => {
    if (input.trim()) {
      navigate(`/${input.trim()}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") goToBoard();
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-2xl mb-4 font-bold">Enter Company / Board Name</h1>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. acme-design"
        className="p-2 rounded border w-64"
      />
      <button
        onClick={goToBoard}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Go to Board
      </button>
    </div>
  );
}

export default BoardEntry;
