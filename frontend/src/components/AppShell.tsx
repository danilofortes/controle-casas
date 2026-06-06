import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="app-layout ui-app">
      <AppSidebar />
      <div className="app-main">
        <div className="app-main-inner">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
