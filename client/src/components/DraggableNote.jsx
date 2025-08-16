import { useState, useEffect } from "react";
import {motion} from "framer-motion";

const getNoteStyle = (type) => {
  switch (type) {
    case "idea":
      return {
        color: "bg-green-100",
      };
    case "issue":
      return {
        color: "bg-red-200",
      };
    case "research":
      return {
        color: "bg-purple-100",
      };
    case "note":
    default:
      return {
        color: "bg-amber-100",
      };
  }
};

function DraggableNote({ note, onMove, onEdit, onDelete, isOwner }) {
  const [dragging, setDragging] = useState(false);
  const [position] = useState({ x: note.x, y: note.y });
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(note.text);

  const { color, emoji } = getNoteStyle(note.type);

  useEffect(()=>{
    return ()=>{
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("mousemove", handleMouseMove)
    };
  },[]);


  const handleMouseDown = (e) => {
    if (isEditing) return;
    setDragging(true);
    e.preventDefault();

    window.removeEventListener("mouseup", handleMouseUp)
    window.removeEventListener("mousemove", handleMouseMove)
  };

  const handleMouseMove = (e) => {
   if (isEditing) return;
   const interactive = e.target.closest('button, textarea, input, select,a,[data-no-drag]');
   if(interactive) return;
   setDragging(true)
   e.preventDefault();
   window.removeEventListener("mouseup", handleMouseUp)
   window.removeEventListener("mousemove", handleMouseMove)
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(false);
      onMove(note.id, position.x, position.y);
      
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("mousemove", handleMouseMove)
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
      className={`absolute z-20 w-52 min-h-[140px] max-h-[140px] p-4 rounded-lg overflow-hidden ${color} shadow-md border ${isOwner ? 'border-blue-500' : 'border-black/10'} cursor-move transition-all duration-150 hover:shadow-xl hover:ring-2 ring-offset-1`}
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${note.id.charCodeAt(0) % 5 - 2}deg) scale(${dragging ? 1.05 : 1})`,
        boxShadow: dragging ? '0 8px 16px rgba(0,0,0,0.15)' : undefined,
      }}
      onMouseDown={handleMouseDown}
      >
    {Date.now() - new Date(note.createdAt || Date.now()).getTime() < 10000 && (
      <span className="absolute top-1 right-1 text-[10px] bg-green-500 text-white px-1 rounded">
        New
      </span>
    )}
  
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-gray-800 text-sm">
          {isOwner ? "You": (note.user?.name || note.user?.displayName||"Anonymous")}
        </span>
        <span className="text-lg">{emoji}</span>
      </div>

      {isEditing ? (
        <form onSubmit={handleEditSubmit}>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            data-no-drag
            onMouseDown={(e)=>e.stopPropagation()}
            className="w-full h-[60px] p-1 rounded border resize-none text-sm"
          />
          <button
            type="submit"
            data-no-drag
            onMouseDown={(e)=>e.stopPropagation()}
            className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded"
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
                data-no-drag
            onMouseDown={(e)=>e.stopPropagation()}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(note.id)}
                data-no-drag
            onMouseDown={(e)=>e.stopPropagation()}
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
