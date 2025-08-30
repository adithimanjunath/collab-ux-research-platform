// src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authedUser, setAuthedUser] = useState(null);

  useEffect(() => {
    // Cypress test hook: allow injecting a fake user to bypass real auth in E2E
    if (typeof window !== 'undefined' && window.Cypress && window.__TEST_AUTH__) {
      setAuthedUser(window.__TEST_AUTH__);
      setLoading(false);
      return () => {};
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthedUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center text-lg">
        🔐 Checking authentication...
      </div>
    );
  }

  if (!authedUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
