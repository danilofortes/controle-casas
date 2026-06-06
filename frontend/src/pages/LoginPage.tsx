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

    <div className="login-screen">

      <div className="login-brand">

        <img src="/logo.svg" alt="Casa em Dia" width={156} height={156} />

      </div>



      <form className="card login-form" onSubmit={aoEnviar}>

        <div className="field">

          <label htmlFor="senha">Senha</label>

          <div className="login-senha-wrap">

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

              className="login-senha-toggle"

              aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}

              onClick={() => setMostrar((m) => !m)}

            >

              <Icon name={mostrar ? "eyeOff" : "eye"} size={20} />

            </button>

          </div>

        </div>



        {erro && <p className="error-text">{erro}</p>}



        <button

          className="btn apex-btn-primary full"

          type="submit"

          disabled={carregando || !senha}

        >

          {carregando ? "Entrando..." : "Entrar"}

        </button>

      </form>

    </div>

  );

}


