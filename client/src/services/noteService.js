// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

// export const fetchNotesByBoard = async (boardId) => {
//   try {
//     const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
//     return await res.json();
//   }
//   catch (err) {
//     console.error("❌ Failed to fetch notes:", err.message);
//     throw err;
//   }
// };
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId) => {
  const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return await res.json();
};
