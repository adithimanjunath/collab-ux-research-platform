import {getAuthHeader} from "../utils/authHeader";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId, { timeoutMs = 8000 } = {}) => {

  if (!boardId || typeof boardId !== 'string') {
    throw new Error('boardId is required');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try{
     const headers =await getAuthHeader();
     const url = `${API_URL}/api/notes?boardId=${encodeURIComponent(boardId)}`;
     const res =  await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
  });

  if (!res.ok){
    const errorText = await res.text().catch(() => '');
    console.error("Error fetching notes:", errorText);
    const msg = errorText || `HTTP ${res.status}`;
    throw new Error(`Failed to fetch notes: ${msg}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
  }
  catch (error) {
    console.error("Error in fetchNotesByBoard:", error);
    throw error;
  }
  finally {
    clearTimeout(timer);
  }
 
};
