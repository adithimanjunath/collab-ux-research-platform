const API_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId) => {
  const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return await res.json();
};
