import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";
import DraggableNote from "./DraggableNote";

const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5050");

function Board() {
  const { boardId } = useParams();
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [onlineUsers, setOnlineUsers] = useState([]);


  // 🔁 Join board and load notes after login
  useEffect(() => {
    if (!isLoggedIn) return;

    socket.emit("join_board", { boardId, username });

    fetch(`${process.env.REACT_APP_SOCKET_URL || "http://localhost:5050"}/api/notes?boardId=${boardId}`)
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch((err) => console.error("Failed to load notes:", err));
  }, [isLoggedIn, boardId, username]);

  // 🧠 Handle incoming socket events
  useEffect(() => {
    socket.on("new_note", (note) => {
      console.log("🟢 Received new_note:", note);
      setNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        return exists ? prev : [...prev, note];
      });
    });

    socket.on("note_edited", (updatedNote) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
      );
    });

    socket.on("note_deleted", ({ id }) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    });

    socket.on("note_moved", (updated) => {
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
  }, []);

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

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
        <h1 className="text-2xl mb-4 font-bold">
          Enter your name to join board: <code>{boardId}</code>
        </h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && username && setIsLoggedIn(true)}
          className="p-2 rounded border w-64"
        />
        <button
          onClick={() => username && setIsLoggedIn(true)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Join Board
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">
        Board: <code>{boardId}</code>
      </h1>
      <div className="mb-2">
        <strong>🟢 Online Users:</strong>{" "}
        {onlineUsers.length > 0 ? onlineUsers.join(", ") : "No one online"}
      </div>

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
        {notes.map((note) => (
          <DraggableNote
            key={note.id}
            note={note}
            onMove={(id, x, y) => updateNotePosition(id, x, y)}
            onEdit={(updatedNote) => socket.emit("edit_note", { ...updatedNote, boardId })}
            onDelete={(id) => socket.emit("delete_note", { id, boardId })}
            isOwner={note.user === username}
          />
        ))}
      </div>
    </div>
  );
}

export default Board;
