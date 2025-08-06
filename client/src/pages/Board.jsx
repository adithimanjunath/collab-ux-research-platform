import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import DraggableNote from "../components/DraggableNote";
import socket from "../services/socketService";
import { fetchNotesByBoard } from "../services/noteService";
import {auth} from "../firebase"; // Import auth for user info
import { onAuthStateChanged } from "firebase/auth";

function Board() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const firebaseUser = auth.currentUser;
  const displayName = firebaseUser?.displayName || firebaseUser?.email || "";
  const [username, setUsername] = useState(displayName);
  
  const [user, setUser] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    setNotes([]);
    setOnlineUsers([]);
  }, [boardId]);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      setUsername(currentUser.displayName || "Anonymous");
      setIsLoggedIn(true);
    } else {
      setUser(null);
      setUsername("");
      setIsLoggedIn(false);
    }
  });

  return () => unsubscribe();
}, []);


  useEffect(() => {
    if (!isLoggedIn || !boardId || !username) return;
    setIsLoading(true);

    socket.emit("join_board", { boardId, username });

    fetchNotesByBoard(boardId)
      .then((data) => {
        setNotes(data.filter((n) => n.boardId === boardId));
      })
      .catch((err) => console.error("❌ Failed to load notes:", err.message))
      .finally(() => setIsLoading(false));
  }, [boardId, isLoggedIn, username]);

  useEffect(() => {
    socket.on("new_note", (note) => {
      if (note.boardId !== boardId) return;
      setNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        return exists ? prev : [...prev, note];
      });
    });

    socket.on("note_edited", (updatedNote) => {
      if (updatedNote.boardId !== boardId) return;
      setNotes((prev) =>
        prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
      );
    });

    socket.on("note_deleted", ({ id }) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    });

    socket.on("note_moved", (updated) => {
      if (updated.boardId !== boardId) return;
      setNotes((prev) =>
        prev.map((note) =>
          note.id === updated.id ? { ...note, x: updated.x, y: updated.y } : note
        )
      );
    }
  );
  socket.on("user_typing", ({ username: typingUser }) => {
  if (typingUser === username) return; // ignore self
  setTypingUsers((prev) => {
    if (!prev.includes(typingUser)) {
      return [...prev, typingUser];
    }
    return prev;
  });

  // remove after timeout
  setTimeout(() => {
    setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
  }, 3000); // 3s delay
});

socket.on("load_existing_notes", (notes) => {
  setNotes(notes);  // Replace current notes
});

    socket.on("user_list", (users) => setOnlineUsers(users));

    return () => {
      socket.off("new_note");
      socket.off("note_edited");
      socket.off("note_deleted");
      socket.off("note_moved");
      socket.off("user_list");
      socket.off("user_typing");
      socket.off("load_existing_notes");
    };
  }, [boardId, username]);

  useEffect(() => {
    return () => {
      if (boardId && username) {
        socket.emit("leave_board", { boardId, username });
      }
    };
  }, [boardId, username]);

  const leaveBoard = () => {
    socket.emit("leave_board", { boardId, username });
    setIsLoggedIn(false);
    setUsername("");
    setNotes([]);
    navigate("/");
  };

  const addNote = () => {
  if (!noteText.trim()) return;

  const canvasWidth = 1400;
  const canvasHeight = 900;
  const noteWidth = 208;  // tailwind w-52 = 208px
  const noteHeight = 140; // estimated height
  const padding = 16;

  const cols = Math.floor((canvasWidth - padding * 2) / (noteWidth + padding));
  const rows = Math.floor((canvasHeight - padding * 2) / (noteHeight + padding));

  // Generate grid positions
  const positions = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = padding + col * (noteWidth + padding);
      const y = padding + row * (noteHeight + padding);
      positions.push({ x, y });
    }
  }

  // Find the first available (non-overlapping) position
  const reservedZone = [
    {x: 0, y: 60, width: 220,height: 100},
    {x:550, y:0, width:300, height: 60},
  ]
  


const isOverlapping = (pos) =>
  notes.some(
    (n) =>
      Math.abs(n.x - pos.x) < noteWidth &&
      Math.abs(n.y - pos.y) < noteHeight
  ) ||
  reservedZone.some(
    (zone) =>
      pos.x < zone.x + zone.width &&
      pos.x + noteWidth > zone.x &&
      pos.y < zone.y + zone.height &&
      pos.y + noteHeight > zone.y
  );


  const availablePos = positions.find((pos) => !isOverlapping(pos));

  if (!availablePos) {
    alert("❌ No space left on the board!");
    return;
  }

  const newNote = {
    id: uuidv4(),
    text: noteText,
    x: availablePos.x,
    y: availablePos.y,
    user: username,
    boardId,
    type: noteType,
  };

  socket.emit("create_note", newNote);
  setNoteText("");
};

  const updateNotePosition = (id, x, y) => {
    socket.emit("move_note", { id, x, y, boardId });
    
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) 
      {addNote();}
  };

  const handleNoteInputChange = (e) => {
  setNoteText(e.target.value);
  socket.emit("user_typing", { boardId, username });
};

  if (!isLoggedIn) {
  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-xl text-gray-500">Please log in to access the board.</p>
    </div>
  );
}


  return (
    <div className="relative h-screen w-screen bg-neutral-100">
      {/* 🔒 Top input bar (fixed) */}
      <div className="fixed top-4 left-4 z-50 flex items-center space-x-2 bg-white px-4 py-2 shadow rounded">
        <input
          type="text"
          value={noteText}
          onChange={handleNoteInputChange}
          onKeyDown={handleKeyDown}
          className="border p-2 rounded"
          placeholder="Type a note..."
        />
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="note">Note</option>
          <option value="idea">Idea</option>
          <option value="issue">Issue</option>
          <option value="research">Research</option>
        </select>
        <button
          onClick={addNote}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {/* 🧍 Top-right online users row */}
      {onlineUsers.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
          {onlineUsers.map((user) => (
            <div key={user} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow">
                {user.slice(0, 2).toUpperCase()}
              </div>
              <span className="mt-1 text-xs text-gray-700 font-medium">
                {user}
              </span>
            </div>
          ))}

        </div>
      )}
      {user && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-500">
    Logged in as <strong>{user.displayName}</strong>
  </div>
)}


      {/* 🎯 Main canvas area */}
      <div className="absolute inset-0 overflow-auto pt-[100px] flex justify-center items-start">
        <div id="board-canvas" className="relative w-[1400px] min-h-[900px] h-[calc(100vh-150px)] bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden">
          <div className="absolute top-[70px] left-4">
            <button onClick={leaveBoard} className="text-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded shadow">
              ← Leave Board
            </button>
          </div>
          <h1 className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xl font-semibold text-gray-600">
            Board Name: {boardId}
          </h1>
          {typingUsers.length > 0 && (
  <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-sm text-gray-500 font-medium flex flex-col items-center z-50">
    {typingUsers.map((user) => (
      <div key={user} className="animate-pulse">✍️ {user} is typing...</div>
    ))}
  </div>
)}

          {isLoading ? (
            <div className="h-full flex justify-center items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="h-full flex justify-center items-center text-gray-400 italic">
              <p>No notes yet — add your first one! </p>
             
            </div>
          ) : (
            notes.map((note) => (
              <DraggableNote
                key={note.id}
                note={note}
                onMove={updateNotePosition}
                onEdit={(updatedNote) =>
                  socket.emit("edit_note", { ...updatedNote, boardId })
                }
                onDelete={(id) => socket.emit("delete_note", { id, boardId })}
                isOwner={note.user === username}
              />
            ))
          )}
        </div>
      </div>
    </div>
    
  );
}

export default Board;
