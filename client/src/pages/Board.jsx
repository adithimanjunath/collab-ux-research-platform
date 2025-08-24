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
  const joinedRef = useRef(false); 

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [username,setUsername] = useState("");
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [notes, setNotes] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [allowed, setAllowed] = useState(false);  
  const onWaiting  = () => setWaiting(true);
  const onGranted  = () => setWaiting(false); // first user path
  const onApproved = () => setWaiting(false); // approved by a member
  const onRejected = () => setWaiting(false); // optional: also clear overlay
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
    console.log("presence set:", boardId, user.uid);
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
    if (boardId && user && allowed) {
      joinBoardPresence(boardId, user);
      const unsubPresence = listenOnlineUsers(boardId);
      const unsubTyping = listenTypingUsers(boardId, user);
       return () => { leaveBoardPresence(boardId, user); unsubPresence(); unsubTyping(); };
    }
  }, [boardId, user, allowed]);

  // ---------- Load Notes from MongoDB on Mount/Refresh ----------
  useEffect(() => {
    if (!boardId || !user || !allowed) return;
    setIsLoading(true);
    fetchNotesByBoard(boardId)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setNotes(arr.filter((n) => n.boardId === boardId));
      })
      .catch((err) => console.error("❌ Failed to load notes:", err.message))
      .finally(() => setIsLoading(false));
  }, [boardId, user, allowed]);

  // ---------- Socket Connection ----------
  useEffect(() => {
    if (!boardId || !user) return;

    const handleJoinRequest = (data) => {
    if (data.boardId !== boardId) return;
    const requester = data.user?.name || "user";
    const ok = window.confirm(`${requester} wants to join board ${boardId}.  Approve?`);
    if (ok) {
      socket.emit("approve_user", {
        boardId,
        uid: data.user?.uid
      });
    } else {
      socket.emit("reject_user", {
        boardId,
        uid: data.user?.uid
      });
    }
  };
  const handleWaiting   = () => {setWaiting(true);  setAllowed(false);};
  const handleGranted = () => {
    console.log("join_granted");
    setWaiting(false);
    setAllowed(true);
    joinedRef.current = true;
  };
    const handleRejected = () => {
    console.log("join_rejected");
    setWaiting(false);
    setAllowed(false);
    // Optional: navigate away or show a message
    alert("Your request to join the board was rejected.");
    navigate("/");
  };


  
// const handleJoinRequest = (data) => {
//   if (data.boardId !== boardId) return;
//   const requester = data.user?.name || "user";
//   const ok = window.confirm(`${requester} wants to join board ${boardId}. Accept?`);
//   if (ok) {
//     // MUST send the sid so server can place that socket into the room
//     socket.emit("approve_user", { boardId, sid: data.sid });
//   } else {
//     socket.emit("reject_user", { boardId, sid: data.sid });
//   }
// };

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


   const handleApprovedBroadcast = (payload) => {
    setWaiting(false);
  };

  const handleApproved  = () => { setWaiting(false); setAllowed(true); joinedRef.current = true; };

  socket.on("waiting_for_approval", handleWaiting);
  socket.on("join_granted", handleGranted);
  socket.on("join_rejected", handleRejected);
  socket.on("join_request", (d) => { console.log("join_request", d); handleJoinRequest(d); });
  socket.on("new_note",              handleNewNote);
  socket.on("note_edited",           handleNoteEdited);
  socket.on("note_deleted",          handleNoteDeleted);
  socket.on("note_moved",            handleNoteMoved);
  socket.on("load_existing_notes",   handleLoadExisting);
  socket.on("join_approved_broadcast", handleApprovedBroadcast);


    (async () => {
      const token = await user.getIdToken();
      socket.auth = { token };

      if (socket.connected) socket.disconnect();

      socket.on("connect", () => {
  socket.emit("join_board", { boardId, token });
});
 socket.on("connect_error", async () => {
    // refresh token on auth failures
    const fresh = await user.getIdToken(true);
    socket.auth = { token: fresh };
  });

   socket.connect();
  })();

    return () => {
    socket.off("waiting_for_approval", handleWaiting);
    socket.off("join_granted", handleGranted);
    socket.off("join_approved_broadcast", handleApprovedBroadcast);
    socket.off("join_rejected", handleRejected);
    socket.off("join_request",         handleJoinRequest);
    socket.off("new_note",             handleNewNote);
    socket.off("note_edited",          handleNoteEdited);
    socket.off("note_deleted",         handleNoteDeleted);
    socket.off("note_moved",           handleNoteMoved);
    socket.off("load_existing_notes",  handleLoadExisting);

  };
  }, [boardId, user,navigate]);


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
     socket.emit("leave_board", { boardId });
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
{waiting && !allowed && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="rounded-lg bg-white p-6 shadow-xl text-center">
      <h3 className="text-lg font-medium">Requesting access...</h3>
      <p className="text-gray-600 mt-2">Waiting for an existing member to approve your request.</p>
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
    </div>
  </div>
)}


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
