import React, { useEffect, useRef } from "react";
export default function NoteInputBar({
  noteText,
  onTextChange,
  onAdd,
  onKeyDown,
  noteType,
  onTypeChange
}) {
    const inputRef = useRef(null);
    useEffect(() => {inputRef.current?.focus();}, []);
  return (
    <div className="fixed top-4 left-4 z-50 flex items-center space-x-2 bg-white px-4 py-2 shadow rounded">
      <input
        type="text"
        value={noteText}
        onChange={onTextChange}
        onKeyDown={onKeyDown}
        className="border p-2 rounded"
        placeholder="Type a note..."
      />
      <select
        value={noteType}
        onChange={onTypeChange}
        className="border p-2 rounded"
      >
        <option value="note">Note</option>
        <option value="idea">Idea</option>
        <option value="issue">Issue</option>
        <option value="research">Research</option>
      </select>
      <button
        onClick={onAdd}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add
      </button>
    </div>
  );
}
