import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MakeCall from "./components/MakeCall";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MakeCall />} />
        <Route path="/make-call" element={<MakeCall />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
