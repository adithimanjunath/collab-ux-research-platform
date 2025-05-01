import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";


const socket = io("http://localhost:5050");

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🟢 Connected to socket.io server!", socket.id);
    });

    socket.on("new_note", (note) => {
      setNotes((prev)=>{
        const exists = prev.some((n)=> n.id === note.id);
        if (!exists){
          return [...prev, note];
        }
        return prev
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

    return () => {
      socket.off("connect");
      socket.off("new_note");
      socket.off("note_edited");
      socket.off("note_deleted");
    };
  }, []);

  const addNote = () => {
    if (!noteText.trim()) return;
    const newNote = {
      id: uuidv4(),
      text: noteText,
      x: 100,
      y: 100,
      user: username,
    };
    socket.emit("create_note", newNote);
    setNotes((prev)=>[...prev, newNote]);
    setNoteText("");
  };
  

  const updateNotePosition = (id, x, y) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, x, y } : note
      )
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      addNote();
    }
  };
  if (!isLoggedIn) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
        <h1 className="text-2xl mb-4 font-bold">Enter your name to join</h1>
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
      <h1 className="text-2xl font-bold mb-4">Collaborative UX Board</h1>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border p-2 rounded w-full"
          placeholder="Type a note..."
        />
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
            onMove={updateNotePosition}
            onEdit={(updatedNote) => socket.emit("edit_note", updatedNote)}
            onDelete={(id) => socket.emit("delete_note", { id })}
            isOwner={note.user === username}
          />
        ))}
      </div>
    </div>
  );
}
function DraggableNote({ note, onMove,onEdit,onDelete,isOwner }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(note.text);


  const handleMouseDown = (e) => {
    setDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const newX = e.clientX - 100;
    const newY = e.clientY - 100;
    setPosition({ x: newX, y: newY });
    onMove(note.id, newX, newY);
  };

  const handleMouseUp = () => setDragging(false);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onEdit({ ...note, text: editedText });
    setIsEditing(false);
  };
  
  return (
    <div
      className="absolute w-48 p-2 bg-yellow-200 rounded shadow cursor-move"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
    <div className="font-semibold text-sm text-gray-800 mb-1">
        {note.user || "Anonymous"}
      </div>
      {isEditing ? (
        <form onSubmit={handleEditSubmit}>
          <input
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full p-1 rounded border"
          />
          <button type="submit" className="mt-1 bg-green-500 text-white px-2 py-1 rounded">
            Save
          </button>
        </form>
      ) : (
        <div>
          <div>{note.text}</div>
          {isOwner && (
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-500 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="text-red-500 text-sm"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      {note.text}
    </div>
  );
}

export default App;
