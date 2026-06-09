import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type AnotacaoDocumento,
  type Casa,
  type CasaDocumentos,
  type DocumentoPdf,
  type ExtratoPagamento,
  type FotoCasa,
  type ResultadoAnalise,
} from "../lib/api";
import { ModalConfirmarExtrato } from "../components/ModalConfirmarExtrato";
import { useApi } from "../lib/useApi";
import { ConfirmarExclusao } from "../components/ConfirmarExclusao";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";

type Aba = "pdfs" | "fotos" | "anotacoes" | "extratos";

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function lerArquivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function DocumentosPage() {
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const [casaId, setCasaId] = useState<string>("");
  const [aba, setAba] = useState<Aba>("pdfs");
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const [modalAnotacao, setModalAnotacao] = useState<"nova" | AnotacaoDocumento | null>(
    null,
  );
  const [tituloNota, setTituloNota] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [legendaFoto, setLegendaFoto] = useState("");
  const [modalFoto, setModalFoto] = useState(false);

  const [excluindo, setExcluindo] = useState<
    { tipo: "pdf" | "foto" | "anotacao"; item: DocumentoPdf | FotoCasa | AnotacaoDocumento } | null
  >(null);

  const inputPdf = useRef<HTMLInputElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputExtrato = useRef<HTMLInputElement>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultadoAnalise, setResultadoAnalise] = useState<ResultadoAnalise | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [extratos, setExtratos] = useState<ExtratoPagamento[]>([]);
  const [erroExtrato, setErroExtrato] = useState<string | null>(null);

  async function carregarExtratos() {
    if (!casaId) return;
    try {
      const lista = await api.get<ExtratoPagamento[]>(`/extratos?casa_id=${casaId}`);
      setExtratos(lista);
    } catch { setExtratos([]); }
  }

  useEffect(() => { void carregarExtratos(); }, [casaId]);

  async function enviarExtrato(file: File) {
    setAnalisando(true);
    setErroExtrato(null);
    try {
      const dataUrl = await lerArquivo(file);
      setFileDataUrl(dataUrl);
      const comp = new Date().toISOString().slice(0, 7);
      const resultado = await api.post<ResultadoAnalise>("/ia/analisar-extrato", {
        file_data_url: dataUrl,
        competencia: comp,
      });
      setResultadoAnalise(resultado);
    } catch (e) {
      setErroExtrato(e instanceof ApiError ? e.message : "Falha ao analisar extrato.");
    } finally {
      setAnalisando(false);
    }
  }

  const docs = useApi<CasaDocumentos>(
    () => api.get<CasaDocumentos>(`/casas/${casaId}/documentos`),
    [casaId],
  );

  useEffect(() => {
    if (casas.data?.length && !casaId) {
      setCasaId(casas.data[0].id);
    }
  }, [casas.data, casaId]);

  async function enviarPdf(file: File) {
    if (!casaId) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const url = await lerArquivo(file);
      await api.post(`/casas/${casaId}/documentos/pdfs`, {
        nome: file.name,
        tamanho_bytes: file.size,
        url,
      });
      docs.reload();
    } catch (e) {
      setErroAcao(e instanceof ApiError ? e.message : "Falha ao enviar PDF.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarFoto(file: File, legenda: string | null) {
    if (!casaId) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const url = await lerArquivo(file);
      await api.post(`/casas/${casaId}/documentos/fotos`, { legenda, url });
      docs.reload();
      setModalFoto(false);
      setLegendaFoto("");
    } catch (e) {
      setErroAcao(e instanceof ApiError ? e.message : "Falha ao enviar foto.");
    } finally {
      setEnviando(false);
    }
  }

  async function salvarAnotacao() {
    if (!casaId || !modalAnotacao) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      if (modalAnotacao === "nova") {
        await api.post(`/casas/${casaId}/documentos/anotacoes`, {
          titulo: tituloNota,
          texto: textoNota,
        });
      } else {
        await api.put(`/documentos/anotacoes/${modalAnotacao.id}`, {
          titulo: tituloNota,
          texto: textoNota,
        });
      }
      docs.reload();
      setModalAnotacao(null);
    } catch (e) {
      setErroAcao(e instanceof ApiError ? e.message : "Falha ao salvar anotação.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      if (excluindo.tipo === "pdf") {
        await api.del(`/documentos/pdfs/${excluindo.item.id}`);
      } else if (excluindo.tipo === "foto") {
        await api.del(`/documentos/fotos/${excluindo.item.id}`);
      } else {
        await api.del(`/documentos/anotacoes/${excluindo.item.id}`);
      }
      docs.reload();
      setExcluindo(null);
    } catch (e) {
      setErroAcao(e instanceof ApiError ? e.message : "Falha ao excluir.");
    } finally {
      setEnviando(false);
    }
  }

  function abrirNovaAnotacao() {
    setTituloNota("");
    setTextoNota("");
    setModalAnotacao("nova");
  }

  function abrirEditarAnotacao(nota: AnotacaoDocumento) {
    setTituloNota(nota.titulo);
    setTextoNota(nota.texto);
    setModalAnotacao(nota);
  }

  const carregando = casas.loading || (casaId && docs.loading);
  const dados = docs.data;

  return (
    <div className="ui-page">
      <PageHeader
        title="Documentos"
        subtitle="PDFs, fotos e anotações por casa"
        showMenuButton={false}
      />

      {casas.error && <p className="error-text">{casas.error}</p>}
      {erroAcao && <p className="error-text">{erroAcao}</p>}

      {casas.data && casas.data.length > 0 && (
        <div className="doc-casa-picker">
          {casas.data.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`doc-casa-pill ${casaId === c.id ? "active" : ""}`}
              onClick={() => setCasaId(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {carregando && <p className="loading">Carregando…</p>}
      {docs.error && <p className="error-text">{docs.error}</p>}

      {dados && (
        <>
          <div className="doc-tabs">
            <button
              type="button"
              className={`doc-tab ${aba === "pdfs" ? "active" : ""}`}
              onClick={() => setAba("pdfs")}
            >
              <Icon name="file" size={18} />
              PDFs
              <span className="doc-tab-count">{dados.pdfs.length}</span>
            </button>
            <button
              type="button"
              className={`doc-tab ${aba === "fotos" ? "active" : ""}`}
              onClick={() => setAba("fotos")}
            >
              <Icon name="image" size={18} />
              Fotos
              <span className="doc-tab-count">{dados.fotos.length}</span>
            </button>
            <button
              type="button"
              className={`doc-tab ${aba === "anotacoes" ? "active" : ""}`}
              onClick={() => setAba("anotacoes")}
            >
              <Icon name="note" size={18} />
              Anotações
              <span className="doc-tab-count">{dados.anotacoes.length}</span>
            </button>
            <button
              type="button"
              className={`doc-tab ${aba === "extratos" ? "active" : ""}`}
              onClick={() => setAba("extratos")}
            >
              <Icon name="receipt" size={18} />
              Extratos
              <span className="doc-tab-count">{extratos.length}</span>
            </button>
          </div>

          {aba === "pdfs" && (
            <section className="ui-panel doc-section">
              <div className="ui-panel-head">
                <h2 className="ui-panel-title">PDFs de {dados.casa_nome}</h2>
                <div className="ui-panel-actions">
                  <button
                    type="button"
                    className="ui-btn-primary"
                    disabled={enviando}
                    onClick={() => inputPdf.current?.click()}
                  >
                    <Icon name="plus" size={16} />
                    Adicionar PDF
                  </button>
                  <input
                    ref={inputPdf}
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void enviarPdf(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {dados.pdfs.length === 0 ? (
                <div className="doc-empty">
                  <Icon name="file" size={36} />
                  <p>Nenhum PDF nesta casa.</p>
                  <button
                    type="button"
                    className="ui-btn-ghost"
                    onClick={() => inputPdf.current?.click()}
                  >
                    Enviar primeiro documento
                  </button>
                </div>
              ) : (
                <ul className="doc-list">
                  {dados.pdfs.map((pdf) => (
                    <li key={pdf.id} className="doc-list-item">
                      <span className="doc-list-icon" aria-hidden="true">
                        <Icon name="file" size={22} />
                      </span>
                      <div className="doc-list-body">
                        <strong>{pdf.nome}</strong>
                        <span>
                          {formatarTamanho(pdf.tamanho_bytes)} - {formatarData(pdf.created_at)}
                        </span>
                      </div>
                      <div className="doc-list-actions">
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-icon-btn"
                          aria-label={`Abrir ${pdf.nome}`}
                        >
                          <Icon name="eye" size={18} />
                        </a>
                        <button
                          type="button"
                          className="doc-icon-btn danger"
                          aria-label={`Excluir ${pdf.nome}`}
                          onClick={() => setExcluindo({ tipo: "pdf", item: pdf })}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {aba === "fotos" && (
            <section className="ui-panel doc-section">
              <div className="ui-panel-head">
                <h2 className="ui-panel-title">Fotos de {dados.casa_nome}</h2>
                <div className="ui-panel-actions">
                  <button
                    type="button"
                    className="ui-btn-primary"
                    disabled={enviando}
                    onClick={() => setModalFoto(true)}
                  >
                    <Icon name="plus" size={16} />
                    Adicionar foto
                  </button>
                </div>
              </div>

              {dados.fotos.length === 0 ? (
                <div className="doc-empty">
                  <Icon name="image" size={36} />
                  <p>Nenhuma foto nesta casa.</p>
                  <button
                    type="button"
                    className="ui-btn-ghost"
                    onClick={() => setModalFoto(true)}
                  >
                    Enviar primeira foto
                  </button>
                </div>
              ) : (
                <div className="doc-foto-grid">
                  {dados.fotos.map((foto) => (
                    <article key={foto.id} className="doc-foto-card">
                      <img src={foto.url} alt={foto.legenda ?? "Foto da casa"} loading="lazy" />
                      <div className="doc-foto-meta">
                        <div>
                          <strong>{foto.legenda ?? "Sem legenda"}</strong>
                          <span>{formatarData(foto.created_at)}</span>
                        </div>
                        <button
                          type="button"
                          className="doc-icon-btn danger"
                          aria-label="Excluir foto"
                          onClick={() => setExcluindo({ tipo: "foto", item: foto })}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {aba === "anotacoes" && (
            <section className="ui-panel doc-section">
              <div className="ui-panel-head">
                <h2 className="ui-panel-title">Anotações de {dados.casa_nome}</h2>
                <div className="ui-panel-actions">
                  <button
                    type="button"
                    className="ui-btn-primary"
                    disabled={enviando}
                    onClick={abrirNovaAnotacao}
                  >
                    <Icon name="plus" size={16} />
                    Nova anotação
                  </button>
                </div>
              </div>

              {dados.anotacoes.length === 0 ? (
                <div className="doc-empty">
                  <Icon name="note" size={36} />
                  <p>Nenhuma anotação nesta casa.</p>
                  <button type="button" className="ui-btn-ghost" onClick={abrirNovaAnotacao}>
                    Criar primeira anotação
                  </button>
                </div>
              ) : (
                <ul className="doc-nota-list">
                  {dados.anotacoes.map((nota) => (
                    <li key={nota.id} className="doc-nota-card">
                      <div className="doc-nota-head">
                        <h3>{nota.titulo}</h3>
                        <div className="doc-list-actions">
                          <button
                            type="button"
                            className="doc-icon-btn"
                            aria-label={`Editar ${nota.titulo}`}
                            onClick={() => abrirEditarAnotacao(nota)}
                          >
                            <Icon name="edit" size={18} />
                          </button>
                          <button
                            type="button"
                            className="doc-icon-btn danger"
                            aria-label={`Excluir ${nota.titulo}`}
                            onClick={() => setExcluindo({ tipo: "anotacao", item: nota })}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                      </div>
                      <p>{nota.texto}</p>
                      <span className="doc-nota-data">
                        Atualizado em {formatarData(nota.updated_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {modalFoto && (
        <Modal title="Adicionar foto" onClose={() => !enviando && setModalFoto(false)}>
          <div className="field">
            <label htmlFor="legenda-foto">Legenda (opcional)</label>
            <input
              id="legenda-foto"
              value={legendaFoto}
              onChange={(e) => setLegendaFoto(e.target.value)}
              placeholder="Ex.: Fachada, quintal, medidor"
            />
          </div>
          <button
            type="button"
            className="ui-btn-primary full"
            disabled={enviando}
            onClick={() => inputFoto.current?.click()}
          >
            Escolher imagem
          </button>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void enviarFoto(f, legendaFoto.trim() || null);
              e.target.value = "";
            }}
          />
        </Modal>
      )}

      {modalAnotacao && (
        <Modal
          title={modalAnotacao === "nova" ? "Nova anotação" : "Editar anotação"}
          onClose={() => !enviando && setModalAnotacao(null)}
        >
          <div className="field">
            <label htmlFor="titulo-nota">Título</label>
            <input
              id="titulo-nota"
              value={tituloNota}
              onChange={(e) => setTituloNota(e.target.value)}
              placeholder="Ex.: Chave reserva, reforma"
            />
          </div>
          <div className="field">
            <label htmlFor="texto-nota">Texto</label>
            <textarea
              id="texto-nota"
              rows={5}
              value={textoNota}
              onChange={(e) => setTextoNota(e.target.value)}
              placeholder="Detalhes, lembretes, contatos..."
            />
          </div>
          <button
            type="button"
            className="ui-btn-primary full"
            disabled={enviando || !tituloNota.trim()}
            onClick={() => void salvarAnotacao()}
          >
            {modalAnotacao === "nova" ? "Salvar anotação" : "Atualizar anotação"}
          </button>
        </Modal>
      )}

      {aba === "extratos" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Extratos de pagamento</h3>
            <button
              className="ui-btn-primary"
              disabled={analisando}
              onClick={() => inputExtrato.current?.click()}
            >
              {analisando ? "Analisando..." : "+ Enviar extrato"}
            </button>
            <input
              ref={inputExtrato}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void enviarExtrato(f);
                e.target.value = "";
              }}
            />
          </div>

          {erroExtrato && (
            <p style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              {erroExtrato}
            </p>
          )}

          {analisando && (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Analisando extrato com IA...
            </p>
          )}

          {extratos.length === 0 && !analisando ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Nenhum extrato registrado para esta casa.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {extratos.map((e) => (
                <li key={e.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.75rem 1rem", borderRadius: "8px",
                  background: "var(--color-bg-card, #1e1e2e)", border: "1px solid var(--color-border)",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{e.nome_pagador_extrato}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {e.competencia} · {(e.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {e.data_pagamento && ` · ${new Date(e.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                      background: e.status === "confirmado" ? "#22c55e22" : "#f59e0b22",
                      color: e.status === "confirmado" ? "#22c55e" : "#f59e0b",
                    }}>
                      {e.status === "confirmado" ? "Confirmado" : e.status}
                    </span>
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" title="Ver extrato" style={{ color: "var(--color-text-secondary)" }}>
                        <Icon name="file" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {resultadoAnalise && casas.data && (
        <ModalConfirmarExtrato
          resultado={resultadoAnalise}
          casas={casas.data}
          fileDataUrl={fileDataUrl}
          onConfirmado={() => {
            setResultadoAnalise(null);
            void carregarExtratos();
          }}
          onCancelar={() => setResultadoAnalise(null)}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir item"
          descricao={
            excluindo.tipo === "pdf"
              ? `Excluir o PDF "${(excluindo.item as DocumentoPdf).nome}"?`
              : excluindo.tipo === "foto"
                ? "Excluir esta foto da casa?"
                : `Excluir a anotação "${(excluindo.item as AnotacaoDocumento).titulo}"?`
          }
          carregando={enviando}
          onConfirmar={() => void confirmarExclusao()}
          onCancelar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
