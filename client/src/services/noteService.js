const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId) => {
  const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`);
  console.log("Fetching notes for", boardId);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return await res.json();
};
