import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { Icon } from "../components/Icon";

export function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await entrar(senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(
        err instanceof ApiError ? err.message : "Não foi possível entrar.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="app-frame">
      <header className="screen-header" style={{ paddingBottom: 110 }}>
        <h1>Casa em Dia</h1>
        <p className="subtitle">Controle de aluguéis e contas</p>
      </header>

      <div className="screen-body">
        <form className="card" onSubmit={aoEnviar}>
          <h2 style={{ marginTop: 0, marginBottom: 18 }}>Bem-vindo</h2>

          <div className="field">
            <label htmlFor="senha">Senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="senha"
                type={mostrar ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setMostrar((m) => !m)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={mostrar ? "eyeOff" : "eye"} size={20} />
              </button>
            </div>
          </div>

          {erro && <p className="error-text">{erro}</p>}

          <button className="btn" type="submit" disabled={carregando || !senha}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            marginTop: 24,
          }}
        >
          Acesso por senha única compartilhada.
        </p>
      </div>
    </div>
  );
}
