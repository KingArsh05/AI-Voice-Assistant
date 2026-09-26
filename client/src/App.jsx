import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MakeCall from "./components/MakeCall";
import BulkCalls from "./components/BulkCalls";
import CallLogs from "./components/CallLogs";
import Hotels from "./components/Hotels";
import CRM from "./components/CRM";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        {/* Left fixed Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/" element={<Navigate to="/crm" replace />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/make-call" element={<MakeCall />} />
              <Route path="/bulk-calls" element={<BulkCalls />} />
              <Route path="/call-logs" element={<CallLogs />} />
              <Route path="/hotels" element={<Hotels />} />
              <Route path="*" element={<Navigate to="/crm" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
