// src/components/Header.jsx
import React, { useMemo, useState } from "react";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
  Menu,
  MenuItem,
 Typography
} from "@mui/material";

export default function Header({
  mode = "board", // 👈 default to board
  onlineUsers = [],
  user,
  onLeave,
  title,
  subtitle,
  noteText,
  onTextChange,
  onAdd,
  noteType,
  onTypeChange,
  filter = {},
  onToggleFilter = () => {},
  children, // 👈 allows injecting buttons (e.g., Export PDF in ReportPage)
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  const processedUsers = useMemo(() => {
    const nameCounts = onlineUsers.reduce((acc, u) => {
      const name = u?.name || u?.email || "User";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return onlineUsers.map((u) => {
      const name = u?.name || u?.email || "User";
      const collision = nameCounts[name] > 1;
      return {
        ...u,
        displayName: collision
          ? `${name} (${u?.email || u?.uid?.slice(0, 5)})`
          : name,
      };
    });
  }, [onlineUsers]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-[1600px] px-6 py-3 flex items-center justify-between gap-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 
                          text-white font-bold grid place-items-center shadow-md">
            UX
          </div>
          <div>
            <Typography variant="h2" component="h1">{title}</Typography>
            <Typography variant="body1" color="text.secondary">{subtitle}</Typography>
          </div>
        </div>

        {/* Center: Board Note Input (only in board mode) */}
        {mode === "board" && (
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 w-full max-w-xl">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Type a note..."
                value={noteText}
                onChange={onTextChange}
              />

              {/* Note type selection */}
              <ToggleButtonGroup
                value={noteType}
                exclusive
                size="small"
                onChange={(e, value) => value && onTypeChange({ target: { value } })}
              >
                <ToggleButton value="note">Note</ToggleButton>
                <ToggleButton value="idea">Idea</ToggleButton>
                <ToggleButton value="issue">Issue</ToggleButton>
                <ToggleButton value="research">Research</ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onAdd}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Right: Board Actions */}
        <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={onLeave}
              >
                Leave
              </Button>
          {mode === "board" ? (
             <>
              {/* Online Users Button */}
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                👥 {processedUsers.length}
              </Button>

              {/* Online Users Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{
                  paper: {
                    style: {
                      maxHeight: 200,
                      width: "220px",
                    },
                  },
                }}
              >
                {processedUsers.length === 0 ? (
                  <MenuItem disabled>No users online</MenuItem>
                ) : (
                  processedUsers.map((u) => (
                    <MenuItem key={u.uid}>{u.displayName}</MenuItem>
                  ))
                )}
              </Menu>
            </>
          ) : (
            children // Report-specific actions
          )}
        </div>
      </div>

      {/* Filters Row (only for board mode) */}
      {mode === "board" && (
        <div className="mx-auto max-w-[1600px] px-6 pb-3">
          <div className="flex items-center gap-2">
            <Chip
              label="Filter"
              size="small"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 500,
                bgcolor: "grey.100",
                color: "text.secondary",
                borderRadius: "8px",
              }}
            />
            <ToggleButtonGroup
              value={Object.keys(filter).filter((key) => filter[key])}
              onChange={(_, selected) => {
                const newFilter = Object.fromEntries(
                  ["note", "idea", "issue", "research"].map((t) => [
                    t,
                    selected.includes(t),
                  ])
                );
                Object.keys(newFilter).forEach((type) => {
                  if (filter[type] !== newFilter[type]) {
                    onToggleFilter(type);
                  }
                });
              }}
              size="small"
              color="primary"
              sx={{
                borderRadius: 999, // pill-like group
                overflow: "hidden",
                "& .MuiToggleButton-root": {
                  border: "none",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  px: 2,
                  bgcolor: "primary.50",
                  color: "primary.dark",
                  "&:hover": { bgcolor: "primary.100" },
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                },
              }}
            >
              <ToggleButton value="note">Note</ToggleButton>
              <ToggleButton value="idea">Idea</ToggleButton>
              <ToggleButton value="issue">Issue</ToggleButton>
              <ToggleButton value="research">Research</ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>
      )}
    </header>
  );
}
