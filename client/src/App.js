import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";
import DraggableNote from "./DraggableNote";



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
 

export default App;
