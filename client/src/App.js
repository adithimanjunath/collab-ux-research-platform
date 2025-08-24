import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Board from "./pages/Board";
import BoardEntry from "./pages/BoardEntry";
import HomePage from "./pages/Homepage"; // Import the HomePage component
import './index.css'; // Import your global styles
import ReportPage from './pages/ReportPage';
import ProtectedRoute from "./components/ProtectedRoutes"; // Import the ProtectedRoute component
import AppLayout from "./layouts/AppLayout";



function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout/>}>
        <Route path="/" element={<HomePage />} />
        
        <Route path="/collab"
          element={
            <ProtectedRoute>
              <BoardEntry />
            </ProtectedRoute>
          }
        />
        <Route path="/:boardId"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        />

        <Route path="/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="p-10 text-center">Page Not Found</div>} />
      </Route>
      </Routes>
    </Router>
  );
}

export default App;
