import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Casa, type Terreno } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon } from "../components/Icon";
import { formatarCentavos } from "../lib/format";

export function CasasPage() {
  const navigate = useNavigate();
  const terrenos = useApi<Terreno[]>(() => api.get<Terreno[]>("/terrenos"), []);
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);

  const carregando = terrenos.loading || casas.loading;
  const erro = terrenos.error || casas.error;

  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (terrenos.data) setAbertos(new Set(terrenos.data.map((t) => t.id)));
  }, [terrenos.data]);

  function alternar(id: string) {
    setAbertos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <>
      <header className="screen-header">
        <h1>Casas</h1>
        <p className="subtitle">Terrenos, casas e moradores</p>
      </header>

      <div className="screen-body">
        {carregando && <p className="loading">Carregando…</p>}
        {erro && <p className="error-text">{erro}</p>}

        {terrenos.data &&
          casas.data &&
          !carregando &&
          terrenos.data.length === 0 && (
            <p className="empty">
              Nenhum terreno cadastrado ainda.
              <br />
              Use o botão + para começar.
            </p>
          )}

        {terrenos.data?.map((terreno) => {
          const casasDoTerreno =
            casas.data?.filter((c) => c.terreno_id === terreno.id) ?? [];
          const aberto = abertos.has(terreno.id);
          return (
            <div className="terreno-group" key={terreno.id}>
              <button
                className="terreno-head"
                onClick={() => alternar(terreno.id)}
                aria-expanded={aberto}
              >
                <div className="badge-icon terreno-badge">
                  <Icon name="map" size={22} />
                </div>
                <div className="li-main">
                  <div className="li-title">{terreno.nome}</div>
                  <div className="li-sub">
                    {terreno.endereco?.trim() ||
                      `${casasDoTerreno.length} ${
                        casasDoTerreno.length === 1 ? "casa" : "casas"
                      }`}
                  </div>
                </div>
                <span className="terreno-count">{casasDoTerreno.length}</span>
                <span className={`chevron-toggle ${aberto ? "aberto" : ""}`}>
                  <Icon name="chevronRight" size={20} />
                </span>
              </button>

              {aberto && (
                <div className="terreno-body">
                  {casasDoTerreno.length === 0 && (
                    <p className="terreno-vazio">Sem casas neste terreno.</p>
                  )}
                  {casasDoTerreno.map((casa) => (
                    <button
                      className="casa-row"
                      key={casa.id}
                      onClick={() => navigate(`/casas/${casa.id}`)}
                    >
                      <div className="badge-icon">
                        <Icon name="building" size={20} />
                      </div>
                      <div className="li-main">
                        <div className="li-title">{casa.nome}</div>
                        <div className="li-sub">
                          {formatarCentavos(casa.aluguel_centavos)} · vence dia{" "}
                          {casa.dia_vencimento}
                        </div>
                      </div>
                      {!casa.ativo && <span className="tag">inativa</span>}
                      <Icon name="chevronRight" size={18} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
