// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

// function BoardEntry() {
//   const [input, setInput] = useState("");
//   const navigate = useNavigate();

//   const goToBoard = () => {
//     if (input.trim()) {
//       navigate(`/${input.trim()}`);
//     }
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter") goToBoard();
//   };

//   return (
//     <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
//       <h1 className="text-2xl mb-4 font-bold">Enter Company / Board Name</h1>
//       <input
//         type="text"
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//         onKeyDown={handleKeyDown}
//         placeholder="e.g. acme-design"
//         className="p-2 rounded border w-64"
//       />
//       <button
//         onClick={goToBoard}
//         className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
//       >
//         Go to Board
//       </button>
//     </div>
//   );
// }

// export default BoardEntry;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function BoardEntry() {
  const [boardName, setBoardName] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!boardName || !userName) return;
    navigate(`/${boardName.trim()}`, {
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
