import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5050");

const getNoteColor = (type) => {
  switch (type) {
    case "idea":
      return "bg-yellow-200";
    case "issue":
      return "bg-red-200";
    case "research":
      return "bg-green-200";
    case "note":
    default:
      return "bg-blue-100";
  }
};

function DraggableNote({ note, onMove, onEdit, onDelete, isOwner }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(note.text);

  useEffect(() => {
    if (!dragging) {
      setPosition({ x: note.x, y: note.y });
    }
  }, [note.x, note.y, dragging]);

  const handleMouseDown = (e) => {
    if (isEditing) return;
    setDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const newX = e.clientX - 100;
    const newY = e.clientY - 100;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(false);
      onMove(note.id, position.x, position.y);
      socket.emit("move_note", {
        id: note.id,
        x: position.x,
        y: position.y,
        boardId: note.boardId,
      });
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onEdit({ ...note, text: editedText });
    setIsEditing(false);
  };

  return (
    <div
      className={`absolute w-48 p-2 rounded shadow cursor-move ${getNoteColor(
        note.type
      )}`}
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
          <button
            type="submit"
            className="mt-1 bg-green-500 text-white px-2 py-1 rounded"
          >
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
    </div>
  );
}

export default DraggableNote;
