import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CasasPage } from "./pages/CasasPage";
import { CasaPage } from "./pages/CasaPage";
import { NovoPage } from "./pages/NovoPage";
import { RelatorioPage } from "./pages/RelatorioPage";
import { AjustesPage } from "./pages/AjustesPage";
import type { ReactNode } from "react";

function Protegido({ children }: { children: ReactNode }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { autenticado } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={autenticado ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <Protegido>
            <AppShell />
          </Protegido>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/casas" element={<CasasPage />} />
        <Route path="/casas/:id" element={<CasaPage />} />
        <Route path="/novo" element={<NovoPage />} />
        <Route path="/relatorio" element={<RelatorioPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
