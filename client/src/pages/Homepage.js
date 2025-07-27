import React from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Choose a Feature</h1>
      <div className="flex space-x-8">
        <button
          onClick={() => navigate("/collab")}
          className="px-8 py-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700"
        >
          🧩 Collab Board
        </button>
        <button
          onClick={() => navigate("/report")}
          className="px-8 py-4 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700"
        >
          📄 Report Generator
        </button>
      </div>
    </div>
  );
}

export default HomePage;
