import { useEffect } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import MapPage from "./routes/MapPage";
import DashboardPage from "./routes/DashboardPage";
import AdminPage from "./routes/AdminPage";
import MissionsPage from "./routes/MissionsPage";
import AboutPage from "./routes/AboutPage";
import ChatbotPanel from "./components/ChatbotPanel";
import { useUiStore } from "./store/uiStore";
import { Button } from "./components/ui/button";
import { MessageCircle, X } from "lucide-react";

function App() {
  const isChatbotOpen = useUiStore((s) => s.isChatbotOpen);
  const toggleChatbot = useUiStore((s) => s.toggleChatbot);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 app-gradient">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500/80 grid place-items-center text-white font-semibold">
            CS
          </div>
          <div>
            <p className="text-lg font-semibold">城視 CitySight</p>
            <p className="text-sm text-slate-400">讓城市安全看得見</p>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <NavLink to="/">地圖</NavLink>
          <NavLink to="/dashboard">儀表板</NavLink>
          <NavLink to="/admin">管理員</NavLink>
          <NavLink to="/missions">任務牆</NavLink>
          <NavLink to="/about">關於</NavLink>
        </nav>
      </header>

      <main className="relative">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:areaId" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/slide"
            element={
              <ExternalRedirect to="https://www.figma.com/slides/z0wx5cO3Dgx38QmrrgdFG1/%E5%9F%8E%E8%A6%96-CitySight?node-id=15-1971&t=9mgQp282UP6IEPDP-1" />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
          {isChatbotOpen && <ChatbotPanel />}
          <Button variant="secondary" onClick={toggleChatbot}>
            {isChatbotOpen ? (
              <>
                <X className="h-4 w-4" aria-hidden />
                Close
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Chatbot
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-200"
    >
      {children}
    </Link>
  );
}

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  return null;
}

export default App;
