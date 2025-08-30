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

  // Demo-only gate overlay
  const [waiting, setWaiting] = useState(false); // shows overlay while requesting/approving
  const [gatePhase, setGatePhase] = useState("idle"); // 'idle' | 'request' | 'granted'
  const [gateMessage, setGateMessage] = useState("");
  // track latest others count to avoid stale closures
  const othersCountRef = useRef(0);

  const [notes, setNotes] = useState([]);
  // Demo-only overlay flag (no real approval). First user sees no popup; others see ~1s.
  
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

// ---------- Demo-only overlay (no real approval) ----------
// Only show a quick 1s overlay for **new** joiners if someone else is already online.
// No overlay for the very first user or for users who were already on the board.
const hasSeenSelfRef = useRef(false);

useEffect(() => {
  if (!user || !boardId) return;
  const list = Array.isArray(onlineUsers) ? onlineUsers : [];
  const iAmListed = list.some((u) => u?.uid === user.uid);

  // Mark once when we first see ourselves in presence,
  // but do NOT open/close the overlay here (socket event is the single source of truth).
  if (!hasSeenSelfRef.current && iAmListed) {
    hasSeenSelfRef.current = true;
  }

  // Keep a live ref of others count to use inside socket callbacks
  const oc = list.filter((u) => u?.uid && u.uid !== user?.uid).length;
  othersCountRef.current = oc;
  console.debug("[gate] presence updated | iAmListed=", iAmListed, "othersCount=", oc);
}, [onlineUsers, user, boardId]);

// Also keep the ref up to date independently (in case presence changes after socket events)
useEffect(() => {
  const list = Array.isArray(onlineUsers) ? onlineUsers : [];
  const oc = list.filter((u) => u?.uid && u.uid !== user?.uid).length;
  othersCountRef.current = oc;
}, [onlineUsers, user]);

  // ---------- Demo gate autopilot (frontend-only) ----------
  // If a non-first user joins, show a short request phase, then auto-grant
  useEffect(() => {
    console.debug("[gate] autopilot tick | waiting=", waiting, "phase=", gatePhase);
    if (!waiting) return; // only run while overlay visible
    let toGrant, toClose, toFailsafe;

    if (gatePhase === "request") {
      // After ~1.5s, pretend someone approved
      toGrant = setTimeout(() => {
        setGatePhase("granted");
        setGateMessage("You're in! Enjoy collaborating.");
      }, 1500);
      // Absolute failsafe: if something interrupts state changes, force-close after 5s
      toFailsafe = setTimeout(() => {
        setGatePhase("granted");
        setGateMessage("You're in! Enjoy collaborating.");
      }, 4000);
    }

    if (gatePhase === "granted") {
      // Keep the success state visible for ~2.5s, then close
      toClose = setTimeout(() => {
        setWaiting(false);
        setGatePhase("idle");
        setGateMessage("");
      }, 2500);
    }

    return () => {
      if (toGrant) clearTimeout(toGrant);
      if (toClose) clearTimeout(toClose);
      if (toFailsafe) clearTimeout(toFailsafe);
    };
  }, [waiting, gatePhase]);

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
    // Cypress E2E test hook: if a fake user is injected, use it
    if (typeof window !== 'undefined' && window.Cypress && window.__TEST_AUTH__) {
      setUser(window.__TEST_AUTH__);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setUsername(currentUser?.displayName || "Anonymous");
      if (!currentUser) {
        const hasTestUser = typeof window !== 'undefined' && window.Cypress && window.__TEST_AUTH__;
        if (!hasTestUser) navigate("/login"); // redirect if not logged in
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
       return () => { leaveBoardPresence(boardId, user); 
        if (typeof unsubPresence === 'function') unsubPresence();
         if (typeof unsubTyping === 'function')  unsubTyping();
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

    const handleLoadExisting = (payload) => {
      const arr = Array.isArray(payload) ? payload : (payload?.notes ?? []);
      setNotes(arr.filter((n) => n.boardId === boardId));
    };


  const handleJoinGranted = (payload) => {
    // Prefer the server’s count if provided; fall back to our presence ref.
    const serverCount = typeof payload?.othersCount === "number" ? payload.othersCount : null;
    const oc = serverCount !== null ? serverCount : Number(othersCountRef.current || 0);
    console.debug("[gate] join_granted received | payload=", payload, "effectiveOthersCount=", oc);

    if (oc <= 0) {
      // First user: skip the overlay entirely
      setWaiting(false);
      setGatePhase("idle");
      setGateMessage("");
      return;
    }

    // Non-first users: show short success overlay
    setWaiting(true);
    setGatePhase("granted");
    setGateMessage("You're in! Enjoy collaborating.");
    setTimeout(() => {
      setWaiting(false);
      setGatePhase("idle");
      setGateMessage("");
    }, 3000);
  };

  socket.on("new_note",              handleNewNote);
  socket.on("note_edited",           handleNoteEdited);
  socket.on("note_deleted",          handleNoteDeleted);
  socket.on("note_moved",            handleNoteMoved);
  socket.on("load_existing_notes",   handleLoadExisting);
  socket.on("join_granted",          handleJoinGranted);
  console.debug("[socket] listeners registered for board", boardId);


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
      socket.off("new_note",             handleNewNote);
      socket.off("note_edited",          handleNoteEdited);
      socket.off("note_deleted",         handleNoteDeleted);
      socket.off("note_moved",           handleNoteMoved);
      socket.off("load_existing_notes",  handleLoadExisting);
      socket.off("join_granted",         handleJoinGranted);
      socket.off("connect");
      socket.off("connect_error");
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
  if (!anyChecked) return arr;
  return arr.filter((n) => filter[n?.type] ?? false);
}, [notes, filter]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen" style={{ backgroundColor: theme.palette.background.default }}  >
      {waiting && (
        <div
          data-testid="board-gate-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          role="dialog"
          aria-modal="true"
          aria-label={gatePhase === "request" ? "Requesting access" : "Access granted"}
          style={{ pointerEvents: "auto" }}
        >
          <div className="rounded-lg bg-white p-6 shadow-xl text-center min-w-[280px]">
            {gatePhase === "request" ? (
              <>
                <h3 className="text-lg font-medium">{gateMessage || "Requesting access..."}</h3>
                <p className="text-gray-600 mt-2">Waiting for an existing member to approve your request.</p>
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">{gateMessage || "You're in!"}</h3>
                <div className="mx-auto mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.963a.75.75 0 10-1.22-.874l-3.236 4.52-1.53-1.53a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.656-5.332z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-600 mt-2">Opening the board…</p>
              </>
            )}
          </div>
        </div>
      )}
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
