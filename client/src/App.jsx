import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";

function App() {
  return (
    <div className="h-screen bg-brand-dark text-white font-sans selection:bg-brand-primary/30">
      <Toaster position="top-right" toastOptions={{ 
        className: '!bg-brand-card !text-white !border !border-brand-border',
        style: { borderRadius: '12px', background: '#1a1b23', color: '#fff' }
      }} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  );
}

export default App;