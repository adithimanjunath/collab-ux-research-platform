import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Board from "./Board";
import BoardEntry from "./BoardEntry";


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
