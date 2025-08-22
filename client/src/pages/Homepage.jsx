import React, {useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider,signInWithPopup, signOut } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button, Typography, Paper,Box, Avatar,} from "@mui/material";

function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
       const mapped ={
        name: currentUser.displayName || currentUser.email || "User",
        email: currentUser.email,
        uid: currentUser.uid
       };
       setUser(mapped);
       localStorage.setItem("user", JSON.stringify(mapped));
      } else {
        setUser(null);
        localStorage.removeItem("user")
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = {
        name : result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
    } catch (error) {
      console.error("Login failed:", error);

      }
  };

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null);
    localStorage.removeItem("user");
  };

  const goTo = (path) => {
    navigate(path, { state: {user} });
  };


  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      {!user ? (
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welcome to Collaborative UX Research Platform
          </Typography>
          {/* Login = High-emphasis → Filled */}
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleLogin}
          >
            Sign in with Google
          </Button>
        </Paper>
      ) : (
        <>
          <Paper
            elevation={3}
            sx={{
              p: 5,
              mb: 5,
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              src={user.photoURL}
              alt={user.name}
              sx={{ width: 80, height: 80, mb: 2 }}
            />
            <Typography variant="h6" fontWeight={600}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>

            {/* Logout = Danger → Filled error */}
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleLogout}
              sx={{ mt: 3 }}
            >
              Logout
            </Button>
          </Paper>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            Select an option
          </Typography>
          <Box display="flex" gap={3} mt={2}>
            {/* Create Board = Tonal */}
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              onClick={() => goTo("/collab")}
            >
              Create Board
            </Button>

            {/* Report Generator = Outlined */}
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              onClick={() => goTo("/report")}
            >
              Report Generator
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default HomePage;
