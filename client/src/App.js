import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Board from "./pages/Board";
import BoardEntry from "./pages/BoardEntry";
import './index.css'; // Import your global styles



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/:boardId" element={<Board />} />
        <Route path="*" element={<BoardEntry />} />

      </Routes>
    </Router>
  );
}

export default App;
