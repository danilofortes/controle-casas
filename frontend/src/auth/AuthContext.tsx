import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  clearToken,
  getToken,
  onUnauthorized,
  setToken,
  type LoginResponse,
} from "../lib/api";

interface AuthContextValue {
  autenticado: boolean;
  entrar: (senha: string) => Promise<void>;
  sair: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean>(() => !!getToken());

  useEffect(() => {
    const handler = () => setAutenticado(false);
    onUnauthorized.addEventListener("unauthorized", handler);
    return () => onUnauthorized.removeEventListener("unauthorized", handler);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      autenticado,
      async entrar(senha: string) {
        const res = await api.post<LoginResponse>("/auth/login", { senha });
        setToken(res.access_token);
        setAutenticado(true);
      },
      sair() {
        clearToken();
        setAutenticado(false);
      },
    }),
    [autenticado],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
