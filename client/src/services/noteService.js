import {getAuthHeader} from "../utils/authUtils";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId) => {
  const headers = getAuthHeader();
  const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`,{
    headers,
  });

  if (!res.ok) throw new Error("Failed to fetch notes");
  return await res.json();
};
