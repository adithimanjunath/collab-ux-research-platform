import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";


const socket = io("http://localhost:5050");

function App() {
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

    return () => {
      socket.off("connect");
      socket.off("new_note");
    };
  }, []);

  const addNote = () => {
    if (!noteText.trim()) return;
    const newNote = {
      id: uuidv4(),
      text: noteText,
      x: 100,
      y: 100,
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
          />
        ))}
      </div>
    </div>
  );
}

function DraggableNote({ note, onMove }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });

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

  

  return (
    <div
      className="absolute w-48 p-2 bg-yellow-200 rounded shadow cursor-move"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {note.text}
    </div>
  );
}

export default App;
