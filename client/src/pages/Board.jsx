import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { fetchNotesByBoard } from "../services/noteService";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {useTheme} from "@mui/material/styles"
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection,
} from "firebase/firestore";

import Header from "../components/Header";
import TypingIndicator from "../components/TypingIndicator";
import NotesCanvas from "../components/NoteCanvas";
import socket from "../services/socketService";

function Board() {
  const { boardId } = useParams();
  const boardRef = useRef(null);
  const navigate = useNavigate();
  const theme = useTheme()

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [username,setUsername] = useState("");
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    note: false,
    idea: false,
    issue: false,
    research: false,
  });

  useEffect(() => {
  if (headerRef.current) {
    setHeaderHeight(headerRef.current.offsetHeight);
  }
}, []);
  // ---------- Firestore Presence ----------
  const joinBoardPresence = async (boardId, user) => {
    const ref = doc(db, "boards", boardId, "onlineUsers", user.uid);
    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName || user.email || "User",
      email: user.email || "",
      joinedAt: serverTimestamp(),
    });
    window.addEventListener("beforeunload", () => {
      deleteDoc(ref);
    });
  };

  const leaveBoardPresence = async (boardId, user) => {
    const ref = doc(db, "boards", boardId, "onlineUsers", user.uid);
    await deleteDoc(ref);
  };

  const listenOnlineUsers = (boardId) => {
    const q = collection(db, "boards", boardId, "onlineUsers");
    return onSnapshot(q, (snapshot) => {
      setOnlineUsers(snapshot.docs.map((doc) => doc.data()));
    });
  };

  // ---------- Firestore Typing ----------
  const handleNoteInputChange = (e) => {
    setNoteText(e.target.value);

    if (user && boardId) {
      const typingRef = doc(db, "boards", boardId, "typing", user.uid);
      setDoc(typingRef, {
        uid: user.uid,
        name: user.displayName || user.email || "User",
        isTyping: true,
        lastTyped: serverTimestamp(),
      });

      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        deleteDoc(typingRef);
      }, 3000);
    }
  };

  const listenTypingUsers = (boardId, user) => {
    const typingColRef = collection(db, "boards", boardId, "typing");
    return onSnapshot(typingColRef, (snapshot) => {
      const usersTyping = snapshot.docs
        .map((doc) => doc.data())
        .filter((u) => u.uid !== user.uid && u.isTyping)
        .map((u) => u.name);
      setTypingUsers(usersTyping);
    });
  };

  // ---------- Auth ----------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setUsername(currentUser?.displayName || "Anonymous");
      if (!currentUser) {
        navigate("/login"); // redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [navigate,setUsername]);

  // ---------- Firestore Presence Listeners ----------
  useEffect(() => {
    if (boardId && user) {
      joinBoardPresence(boardId, user);
      const unsubPresence = listenOnlineUsers(boardId);
      const unsubTyping = listenTypingUsers(boardId, user);
      return () => {
        leaveBoardPresence(boardId, user);
        unsubPresence();
        unsubTyping();
      };
    }
  }, [boardId, user]);

  // ---------- Load Notes from MongoDB on Mount/Refresh ----------
  useEffect(() => {
    if (!boardId || !user) return;

    setIsLoading(true);
    fetchNotesByBoard(boardId)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setNotes(arr.filter((n) => n.boardId === boardId));
      })
      .catch((err) => console.error("❌ Failed to load notes:", err.message))
      .finally(() => setIsLoading(false));
  }, [boardId, user]);

  // ---------- Socket Connection ----------
  useEffect(() => {
    if (!boardId || !user) return;
    const handleNewNote = (note) => {
      if (note.boardId !== boardId) return;
      setNotes((prev) => prev.some((n) => n.id === note.id) ? prev : [...prev, note]);
    };

    const handleNoteEdited = (updatedNote) => {
      if (updatedNote.boardId !== boardId) return;
      setNotes((prev) => prev.map((n) => n.id === updatedNote.id ? updatedNote : n));
    };

    const handleNoteDeleted = ({ id }) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    };

    const handleNoteMoved = (updated) => {
      if (updated.boardId !== boardId) return;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === updated.id ? { ...n, x: updated.x, y: updated.y } : n
        )
      );
    };

    const handleLoadExisting = (existing) => {
    // defensive: make sure it's an array
    const arr = Array.isArray(existing) ? existing : [];
    setNotes(arr.filter((n) => n.boardId === boardId));
  };


    socket.on("new_note", handleNewNote);
    socket.on("note_edited", handleNoteEdited);
    socket.on("note_deleted", handleNoteDeleted);
    socket.on("note_moved", handleNoteMoved);
    socket.on("load_existing_notes", handleLoadExisting);

    (async () => {
      const token = await user.getIdToken();
      socket.auth = { token };

      socket.once("connect", () => {
        socket.emit("join_board", { boardId, token });
        socket.emit("request_existing_notes", {boardId, token})
      });

      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    })();
       return () => {
      socket.off("new_note", handleNewNote);
      socket.off("note_edited", handleNoteEdited);
      socket.off("note_deleted", handleNoteDeleted);
      socket.off("note_moved", handleNoteMoved);
      socket.off("load_existing_notes", handleLoadExisting);
      socket.disconnect()
    };
  }, [boardId, user]);

  // ---------- Actions ----------
  const handleEditNote = (updatedNote) => {
    setNotes((prev) => prev.map((n) => n.id === updatedNote.id ? updatedNote : n));
    user.getIdToken().then((token) =>
      socket.emit("edit_note", { ...updatedNote, token, boardId })
    );
  };

  const addNote = () => {
    if (!noteText.trim() || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const NOTE_W = 208, NOTE_H = 140, PAD = 16, MAX_TRIES = 400;

    const reservedZones = [
      { x: 0, y: 60, width: 220, height: 100 },
      { x: 550, y: 0, width: 300, height: 60 },
    ];

    const fits = (x, y) =>
      x >= PAD &&
      y >= PAD &&
      x + NOTE_W <= rect.width - PAD &&
      y + NOTE_H <= rect.height - PAD;

    const overlapsNotes = (x, y) =>
      notes.some((n) => Math.abs(n.x - x) < NOTE_W && Math.abs(n.y - y) < NOTE_H);

    const overlapsReserved = (x, y) =>
      reservedZones.some((z) => x < z.x + z.width && x + NOTE_W > z.x && y + NOTE_H > z.y);

    let placed = null;
    for (let i = 0; i < MAX_TRIES; i++) {
      const x = Math.floor(PAD + Math.random() * (rect.width - NOTE_W - 2 * PAD));
      const y = Math.floor(PAD + Math.random() * (rect.height - NOTE_H - 2 * PAD));
      if (fits(x, y) && !overlapsReserved(x, y) && !overlapsNotes(x, y)) {
        placed = { x, y };
        break;
      }
    }

    if (!placed) {
      alert("❌ No space left on the board.");
      return;
    }

    const newNote = {
      id: uuidv4(),
      text: noteText,
      x: placed.x,
      y: placed.y,
      boardId,
      type: noteType,
      createdAt: new Date().toISOString(),
      user: {
        uid: user?.uid,
        name: user?.displayName || "Anonymous",
        email: user?.email,
      },
    };

    setNotes((prev) => [...prev, newNote]);
    user.getIdToken().then((token) => {
      socket.emit("create_note", { ...newNote, token });
    });
    setNoteText("");
  };

  const updateNotePosition = (id, x, y) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, x, y } : n));
    user.getIdToken().then((token) => {
      socket.emit("move_note", { id, x, y, boardId, token });
    });
  };

  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    user.getIdToken().then((token) =>
      socket.emit("delete_note", { id, boardId, token })
    );
  };

  const leaveBoard = async () => {
    if (user) await leaveBoardPresence(boardId, user);
    navigate("/");
  };

  const filteredNotes = useMemo(() => {
    const arr = Array.isArray(notes) ? notes : [];
    const anyChecked = Object.values(filter).some(Boolean);
    if (!anyChecked) return notes;
    return arr.filter((n) => filter[n?.type] ?? false);
  }, [notes, filter]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen" style={{ backgroundColor: theme.palette.background.default }}  >
      <div ref= {headerRef}>
      <Header
  mode="board"
  title="UX Toolkit"
  subtitle={`Board ID: ${boardId}`}
  onlineUsers={onlineUsers}
  user={user}
  onLeave={leaveBoard}
  noteText={noteText}
  onTextChange={handleNoteInputChange}
  onAdd={addNote}
  noteType={noteType}
  onTypeChange={(e) => setNoteType(e.target.value)}
  filter={filter}
  onToggleFilter={(type) =>
    setFilter((prev) => ({ ...prev, [type]: !prev[type] }))
  }
/>

      </div>
      <div className="h-full flex justify-center items-center overflow-hidden" style={{padding: `${headerHeight + 10}px`}}>
        <div
          ref={boardRef}
          className="relative w-[1400px] max-w-full h-[900px] max-h-full rounded-xl shadow-xl border border-gray-150 overflow-hidden"
          style={{
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}

          {isLoading ? (
            <div className="h-full flex justify-center items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ( 
          <>
          {notes.length === 0 ? (
            <div className="h-full flex justify-center items-center text-gray-400 italic">
              <p>No notes yet — add your first one!</p>
            </div>
          ) : (
            <NotesCanvas
              filteredNotes={filteredNotes}
              isLoading={isLoading}
              onMove={updateNotePosition}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              currentUid={user?.uid}
            />
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Board);
