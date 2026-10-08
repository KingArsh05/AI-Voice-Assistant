import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import MakeSingleCall from "./components/MakeSingleCall";
import MakeBulkCalls from "./components/MakeBulkCalls";
import CallLogs from "./components/call_logs/CallLogs";

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        {/* Left fixed Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/make-single-call" replace />}
              />
              <Route path="/make-single-call" element={<MakeSingleCall />} />
              <Route path="/make-bulk-calls" element={<MakeBulkCalls />} />
              <Route path="/call-logs" element={<CallLogs />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
