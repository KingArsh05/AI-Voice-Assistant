import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/Themecontext";

import Dashboard from "./pages/Dashboard";
import Dialer from "./pages/Dialer";
import CallLogs from "./pages/Calllogs";
import CampaignStudio from "./pages/CampaignStudio";
import Layout from "./components/layout/Layout";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dialer" element={<Dialer />} />
            <Route path="call-logs" element={<CallLogs />} />
            <Route path="campaign-studio" element={<CampaignStudio />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;