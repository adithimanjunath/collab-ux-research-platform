// src/components/NotesCanvas.jsx
import DraggableNote from "./DraggableNote";

export default function NotesCanvas({
  filteredNotes,
  isLoading,
  onMove,
  onEdit,
  
  onDelete,
  currentUid
}) {
  if (isLoading) return null; 
    return (
<>
      {filteredNotes.map((note) => (
        <DraggableNote
          key={note.id}
          note={note}
          onMove={onMove}
          onEdit={onEdit}
          onDelete={onDelete}
          isOwner={note.user?.uid === currentUid}
        />
      ))}
</>


            );


}
