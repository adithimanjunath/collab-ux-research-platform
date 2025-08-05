import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Board from "./pages/Board";
import BoardEntry from "./pages/BoardEntry";
import HomePage from "./pages/Homepage"; // Import the HomePage component
import './index.css'; // Import your global styles
import ReportPage from './pages/ReportPage';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
         <Route path="/collab" element={<BoardEntry />} /> 
        <Route path="/:boardId" element={<Board />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<BoardEntry />} />

      </Routes>
    </Router>
  );
}

export default App;
