import { Outlet } from "react-router-dom";
import { USE_MOCK } from "../lib/mock";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="app-layout apex-app">
      <AppSidebar />
      <div className="app-main">
        {USE_MOCK && (
          <div className="mock-banner" role="status">
            Modo demonstração · dados fictícios
          </div>
        )}
        <div className="app-main-inner">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
