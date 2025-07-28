import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import DraggableNote from "../components/DraggableNote";
import socket from "../services/socketService";
import { fetchNotesByBoard } from "../services/noteService";

function Board() {
  const { boardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState(location.state?.username || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
  setNotes([]);
  setOnlineUsers([]);
}, [boardId]);

  // ✅ Automatically log in if username is passed
  useEffect(() => {
    if (username && !isLoggedIn) {
      setIsLoggedIn(true);
    }
  }, [username, isLoggedIn]);

  const handleLogin = () => {
    if (!username.trim()) return;
    setIsLoggedIn(true);
  };

  useEffect(() => {
    if (!isLoggedIn || !boardId || !username) return;
    setIsLoading(true);

    socket.emit("join_board", { boardId, username });

    fetchNotesByBoard(boardId)
      .then((data) => {
        console.log("📥 Loaded notes from:", data);
        setNotes(data.filter((n) => n.boardId === boardId));
      })
      .catch((err) => {
        console.error("❌ Failed to load notes:", err.message);
        console.dir(err);
      })
      .finally(() => {
      setIsLoading(false); // ✅ Hide spinner no matter what
    });
  }, [boardId, isLoggedIn, username]);

  const leaveBoard = () => {
    socket.emit("leave_board", { boardId, username });
    setIsLoggedIn(false);
    setUsername("");
    setNotes([]);
    navigate("/"); 
  };

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
    });

    socket.on("user_list", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("new_note");
      socket.off("note_edited");
      socket.off("note_deleted");
      socket.off("note_moved");
      socket.off("user_list");
    };
  }, [boardId]);

  const addNote = () => {
    if (!noteText.trim()) return;

    const spacing = 30;
    let baseX = 100;
    let baseY = 100;

    const isOccupied = (x, y) =>
      notes.some((n) => Math.abs(n.x - x) < spacing && Math.abs(n.y - y) < spacing);

    while (isOccupied(baseX, baseY)) {
      baseX += spacing;
      if (baseX > 500) {
        baseX = 100;
        baseY += spacing;
      }
    }

    const newNote = {
      id: uuidv4(),
      text: noteText,
      x: baseX,
      y: baseY,
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
    if (e.key === "Enter") addNote();
  };

  useEffect(() => {
  return () => {
    if (boardId && username) {
      socket.emit("leave_board", { boardId, username });
    }
  };
}, [boardId, username]);

  // ✅ Only show name input if username is truly missing
  if (!isLoggedIn && !username) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
        <h1 className="text-2xl mb-4 font-bold">
          Enter your name to join board: <code>{boardId}</code>
        </h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="p-2 rounded border w-64"
        />
        <button
          onClick={handleLogin}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Join Board
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 p-4 flex relative">
      <button
        onClick={leaveBoard}
        className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
      >
        Leave Board
      </button>

      <div className="flex-1 pr-4">
        <h1 className="text-2xl font-bold mb-4">
          Board: <code>{boardId}</code>
        </h1>

        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border p-2 rounded w-full"
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
            Add Note
          </button>
        </div>

        <div className="relative w-full h-[80vh] border rounded bg-white overflow-hidden">
          {isLoading ? (
         <div className="h-full flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        ) : notes.length === 0 ? (
          <div className="h-full flex justify-center items-center text-gray-400 italic">
            No notes yet — add your first one!
        </div>      
        ) : (
          notes.map((note) => (
            <DraggableNote
              key={note.id}
              note={note}
              onMove={(id, x, y) => updateNotePosition(id, x, y)}
              onEdit={(updatedNote) =>
                socket.emit("edit_note", { ...updatedNote, boardId })
              }
              onDelete={(id) => socket.emit("delete_note", { id, boardId })}
              isOwner={note.user === username}
            />
          )))}
        </div>
      </div>

      {/* Sidebar: Online users */}
      <div className="relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-[-40px] top-0 bg-gray-300 text-black rounded-l px-2 py-1 text-sm"
        >
          {sidebarOpen ? "←" : "→"}
        </button>

        {sidebarOpen && (
          <div className="w-64 bg-white border rounded p-4 h-fit shadow-md ml-2">
            <h2 className="text-lg font-semibold mb-4">Online Users</h2>
            <ul className="space-y-2">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user) => (
                  <li key={user} className="flex items-center space-x-2">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white font-bold">
                      {user.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-gray-800">{user}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No users online</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Board;
