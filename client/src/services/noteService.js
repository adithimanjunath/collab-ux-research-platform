import {getAuthHeader} from "../utils/authHeader";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5050";

export const fetchNotesByBoard = async (boardId) => {
  try{
     const headers =await getAuthHeader();
     const res = await fetch(`${API_URL}/api/notes?boardId=${boardId}`,{
    headers,
  });

  if (!res.ok){
    const errorText = await res.text();
    console.error("Error fetching notes:", errorText);
    throw new Error("Failed to fetch notes");
  }
  return await res.json();
  }
  catch (error) {
    console.error("Error in fetchNotesByBoard:", error);
    throw error;
  }
 
};
