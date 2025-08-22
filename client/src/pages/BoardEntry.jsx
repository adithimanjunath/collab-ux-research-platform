import React, { useState,useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {auth} from "../firebase"; // Import auth for user info
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";

function BoardEntry() {
  const [boardName, setBoardName] = useState("");
  const navigate = useNavigate();
  const theme = useTheme()

  const sanitizeBoardName = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  useEffect(() => {
  if (!auth.currentUser) {
    navigate("/");
  }
}, [navigate]);

  const handleJoin = () => {
    if (!boardName ) return;

     const sanitizedBoard = sanitizeBoardName(boardName);
     const username = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
    
      navigate(`/${sanitizedBoard}`, {
      state: { username},
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center space-y-4" style={{ backgroundColor: theme.palette.background.default }}>
      <h1 className="text-2xl font-bold">Enter Company / Board Name</h1>
     <TextField
  label="Company / Board Name"
  variant="outlined"
  size="small"
  value={boardName}
  onChange={(e) => setBoardName(e.target.value)}
  sx={{ width: 300 }}
/>
      <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleJoin}
          >
             Join Board
          </Button>
      <Link to="/" className="text-blue-500 px-6 py-2 rounded hover:underline"> Back</Link>
    </div>
  );
}

export default BoardEntry;
