// src/layouts/AppLayout.tsx
import * as React from "react";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 relative min-h-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
