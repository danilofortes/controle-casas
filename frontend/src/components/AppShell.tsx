import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { DesktopHeader } from "./DesktopHeader";

export function AppShell() {
  return (
    <>
      <DesktopHeader />
      <div className="app-frame app-shell">
        <Outlet />
        <BottomNav />
      </div>
    </>
  );
}
