import { useState, useEffect } from "react";
import {motion} from "framer-motion";

const getNoteStyle = (type) => {
  switch (type) {
    case "idea":
      return {
        color: "bg-yellow-300",
        emoji: "💡",
      };
    case "issue":
      return {
        color: "bg-red-300",
        emoji: "❗",
      };
    case "research":
      return {
        color: "bg-green-200",
        emoji: "🧪",
      };
    case "note":
    default:
      return {
        color: "bg-blue-200",
        emoji: "📌",
      };
  }
};

function DraggableNote({ note, onMove, onEdit, onDelete, isOwner }) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(note.text);

  const { color, emoji } = getNoteStyle(note.type);

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

    const canvas = document.getElementById("board-canvas");
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    const offsetX = e.clientX - canvasRect.left;
    const offsetY = e.clientY - canvasRect.top;

    const noteWidth = 208; // Tailwind w-52
    const noteHeight = 140;

    let newX = offsetX - noteWidth / 2;
    let newY = offsetY - noteHeight / 2;

    // Clamp within bounds
    newX = Math.max(0, Math.min(newX, canvasRect.width - noteWidth));
    newY = Math.max(0, Math.min(newY, canvasRect.height - noteHeight));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(false);
      onMove(note.id, position.x, position.y);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onEdit({ ...note, text: editedText });
    setIsEditing(false);
  };

  return (
    <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`absolute w-52 min-h-[140px] max-h-[140px] p-4 rounded-lg overflow-hidden ${color} shadow-md border border-black/10 cursor-move transition-all duration-150 hover:shadow-xl hover:ring-2 ring-offset-1`}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${note.id.charCodeAt(0) % 5 - 2}deg)`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      >
  
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-gray-800 text-sm">
          {isOwner ? "You": (note.user || "Anonymous")}
        </span>
        <span className="text-lg">{emoji}</span>
      </div>

      {isEditing ? (
        <form onSubmit={handleEditSubmit}>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-[60px] p-1 rounded border resize-none text-sm"
          />
          <button
            type="submit"
            className="mt-2 bg-green-500 text-white px-3 py-1 text-sm rounded"
          >
            Save
          </button>
        </form>
      ) : (
        <div className="text-sm text-gray-900 whitespace-pre-wrap overflow-y-auto max-h-[60px] pr-1">
          {note.text}
          {isOwner && (
            <div className="mt-3 flex gap-2 text-xs">
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

  </motion.div>
      
  );
}

export default DraggableNote;
