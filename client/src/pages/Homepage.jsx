import React, {useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider,signInWithPopup, signOut } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({currentUser});
      } else {
        setUser(null);
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

  const handleLogout = () => {
    signOut(auth)
    setUser(null);
    localStorage.removeItem("user");
  };

  const goTo = (path) => {
    navigate(path, { state: {user} });
  };


  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gray-100">
      {!user ? (
        <>
        <h1 className="text-3xl font-bold mb-4">Welcome to Collaborative UX Research Platform</h1>
        <button onClick={handleLogin} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Sign in with Google </button>
        </>
      ) : (
        <>
        <div className ="flex flex-col items-center space-y-2">
          <img src ={user.photoURL} alt="avatar" className="w-24 h-24 rounded-full mb-2" />
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-gray-600">{user.email}</p>
          <button onClick={handleLogout} className="mt-4 px-6 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600">
            Logout
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-4">Select an option</h1>
        <div className="flex space-x-8 mt-4">
          <button onClick={() => goTo("/collab")} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Create Board
          </button>
          <button onClick={() => goTo("/report")} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Report Generator
          </button>
        </div>
        </>
      )}
      <footer className="absolute bottom-4 text-sm text-gray-500">
        © 2025 Collaborative UX Research Platform | Made with by Adithi M Shrouthy
      </footer>
    </div>
  );
}

export default HomePage;
