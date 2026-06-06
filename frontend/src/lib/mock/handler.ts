import { formatarCentavos, formatarCompetencia } from "../format";
import { ApiError } from "../api";
import type {
  AnotacaoDocumento,
  CasaDocumentos,
  CasaRelatorio,
  ContaDetalhe,
  Dashboard,
  DocumentoPdf,
  FotoCasa,
  ItemCobranca,
  ItemPendente,
  LoginResponse,
  Relatorio,
  TipoPendencia,
} from "../api";
import { store } from "./store";

const DELAY_MS = 180;

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), DELAY_MS));
}

function parsePath(path: string) {
  const [pathname, search = ""] = path.split("?");
  return {
    segments: pathname.split("/").filter(Boolean),
    query: new URLSearchParams(search),
  };
}

function casaNome(id: string): string {
  return store.casas.find((c) => c.id === id)?.nome ?? "Casa";
}

function documentosCasa(casaId: string): CasaDocumentos {
  const casa = store.casas.find((c) => c.id === casaId);
  if (!casa) throw new ApiError(404, "Casa não encontrada.");
  return {
    casa_id: casa.id,
    casa_nome: casa.nome,
    pdfs: store.pdfs.filter((p) => p.casa_id === casaId),
    fotos: store.fotos.filter((f) => f.casa_id === casaId),
    anotacoes: store.anotacoes.filter((a) => a.casa_id === casaId),
  };
}

function diasParaVencer(vencimento: string | null): number | null {
  if (!vencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento + "T12:00:00");
  return Math.round((v.getTime() - hoje.getTime()) / 86_400_000);
}

function pendenciaDeAluguel(a: (typeof store.alugueis)[0]): ItemPendente | null {
  if (a.pago) return null;
  const dias = diasParaVencer(a.vencimento);
  const atrasado = dias != null && dias < 0;
  return {
    tipo: "ALUGUEL",
    casa_id: a.casa_id,
    casa_nome: casaNome(a.casa_id),
    competencia: a.competencia,
    valor_centavos: a.valor_centavos,
    vencimento: a.vencimento,
    atrasado,
    dias_para_vencer: dias,
    vence_em_breve: dias != null && dias >= 0 && dias <= 3,
    aluguel_id: a.id,
    rateio_id: null,
  };
}

function pendenciaDeRateio(r: (typeof store.rateios)[0]): ItemPendente | null {
  if (r.pago) return null;
  const conta = store.contas.find((c) => c.id === r.conta_id);
  if (!conta || conta.competencia !== store.alugueis[0]?.competencia) return null;
  const dias = diasParaVencer(conta.vencimento);
  const atrasado = dias != null && dias < 0;
  return {
    tipo: conta.tipo as TipoPendencia,
    casa_id: r.casa_id,
    casa_nome: r.casa_nome ?? casaNome(r.casa_id),
    competencia: conta.competencia,
    valor_centavos: r.valor_centavos,
    vencimento: conta.vencimento,
    atrasado,
    dias_para_vencer: dias,
    vence_em_breve: dias != null && dias >= 0 && dias <= 3,
    aluguel_id: null,
    rateio_id: r.id,
  };
}

function dashboard(competencia: string): Dashboard {
  const pendencias: ItemPendente[] = [];
  for (const a of store.alugueis.filter((x) => x.competencia === competencia)) {
    const p = pendenciaDeAluguel(a);
    if (p) pendencias.push(p);
  }
  for (const r of store.rateios) {
    const conta = store.contas.find((c) => c.id === r.conta_id);
    if (conta?.competencia === competencia) {
      const p = pendenciaDeRateio(r);
      if (p) pendencias.push(p);
    }
  }
  const emAberto = pendencias.reduce((s, p) => s + p.valor_centavos, 0);
  return {
    competencia,
    competencia_formatada: formatarCompetencia(competencia),
    total_em_aberto_centavos: emAberto,
    qtd_itens_abertos: pendencias.length,
    qtd_itens_atrasados: pendencias.filter((p) => p.atrasado).length,
    qtd_itens_proximos: pendencias.filter((p) => p.vence_em_breve && !p.atrasado)
      .length,
    pendencias,
  };
}

function relatorio(competencia: string): Relatorio {
  const casas: CasaRelatorio[] = store.casas.map((c) => {
    const aluguel =
      store.alugueis.find((a) => a.casa_id === c.id && a.competencia === competencia)
        ?.valor_centavos ?? 0;
    const rateiosMes = store.rateios.filter((r) => {
      const ct = store.contas.find((x) => x.id === r.conta_id);
      return r.casa_id === c.id && ct?.competencia === competencia;
    });
    const agua = rateiosMes
      .filter((r) => store.contas.find((ct) => ct.id === r.conta_id)?.tipo === "AGUA")
      .reduce((s, r) => s + r.valor_centavos, 0);
    const luz = rateiosMes
      .filter((r) => store.contas.find((ct) => ct.id === r.conta_id)?.tipo === "LUZ")
      .reduce((s, r) => s + r.valor_centavos, 0);
    const aluguelObj = store.alugueis.find(
      (a) => a.casa_id === c.id && a.competencia === competencia,
    );
    const aluguelPago = aluguelObj?.pago ? aluguel : 0;
    const rateiosPagos = rateiosMes
      .filter((r) => r.pago)
      .reduce((s, r) => s + r.valor_centavos, 0);
    const totalDevido = aluguel + agua + luz;
    const totalPago = aluguelPago + rateiosPagos;
    return {
      casa_id: c.id,
      casa_nome: c.nome,
      aluguel_centavos: aluguel,
      agua_centavos: agua,
      luz_centavos: luz,
      total_devido_centavos: totalDevido,
      total_pago_centavos: totalPago,
      em_aberto_centavos: totalDevido - totalPago,
    };
  });

  const totalAReceber = casas.reduce((s, c) => s + c.total_devido_centavos, 0);
  const totalRecebido = casas.reduce((s, c) => s + c.total_pago_centavos, 0);
  const despesasMes = store.despesas
    .filter((d) => d.data.startsWith(competencia))
    .reduce((s, d) => s + d.valor_centavos, 0);

  const contasMes = store.contas.filter((c) => c.competencia === competencia);
  const aguaAdmin = contasMes
    .filter((c) => c.tipo === "AGUA")
    .reduce((s, c) => s + Math.round(c.valor_total_centavos * 0.22), 0);
  const luzAdmin = contasMes
    .filter((c) => c.tipo === "LUZ")
    .reduce((s, c) => s + Math.round(c.valor_total_centavos * 0.2), 0);

  return {
    competencia,
    competencia_formatada: formatarCompetencia(competencia),
    casas,
    totais: {
      total_a_receber_centavos: totalAReceber,
      total_recebido_centavos: totalRecebido,
      total_em_aberto_centavos: totalAReceber - totalRecebido,
      total_despesas_centavos: despesasMes,
    },
    administradora: {
      agua_centavos: aguaAdmin,
      luz_centavos: luzAdmin,
      total_centavos: aguaAdmin + luzAdmin,
      itens: contasMes.map((c) => ({
        conta_id: c.id,
        tipo: c.tipo,
        competencia: c.competencia,
        vencimento: c.vencimento,
        valor_centavos:
          c.tipo === "AGUA"
            ? Math.round(c.valor_total_centavos * 0.22)
            : Math.round(c.valor_total_centavos * 0.2),
        terreno_nome: store.terrenos.find((t) => t.id === c.terreno_id)?.nome ?? null,
      })),
    },
  };
}

function cobrancasCasa(casaId: string, competencia: string): ItemCobranca[] {
  const itens: ItemCobranca[] = [];
  const aluguel = store.alugueis.find(
    (a) => a.casa_id === casaId && a.competencia === competencia,
  );
  if (aluguel) {
    itens.push({
      tipo: "ALUGUEL",
      aluguel_id: aluguel.id,
      rateio_id: null,
      conta_id: null,
      competencia,
      valor_centavos: aluguel.valor_centavos,
      valor_formatado: formatarCentavos(aluguel.valor_centavos),
      vencimento: aluguel.vencimento,
      pago: aluguel.pago,
      pago_em: aluguel.pago_em,
    });
  }
  for (const r of store.rateios.filter((x) => x.casa_id === casaId)) {
    const conta = store.contas.find((c) => c.id === r.conta_id);
    if (!conta || conta.competencia !== competencia) continue;
    itens.push({
      tipo: conta.tipo as TipoPendencia,
      aluguel_id: null,
      rateio_id: r.id,
      conta_id: conta.id,
      competencia,
      valor_centavos: r.valor_centavos,
      valor_formatado: formatarCentavos(r.valor_centavos),
      vencimento: conta.vencimento,
      pago: r.pago,
      pago_em: r.pago_em,
    });
  }
  return itens;
}

function contaDetalhe(id: string): ContaDetalhe {
  const conta = store.contas.find((c) => c.id === id);
  if (!conta) throw new ApiError(404, "Conta não encontrada.");
  const rateios = store.rateios.filter((r) => r.conta_id === id);
  const admin = Math.round(conta.valor_total_centavos * 0.22);
  return {
    ...conta,
    rateios,
    valor_total_formatado: formatarCentavos(conta.valor_total_centavos),
    valor_administradora_centavos: admin,
    valor_administradora_formatado: formatarCentavos(admin),
  };
}

export async function handleMockRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { segments, query } = parsePath(path);
  const m = method.toUpperCase();

  if (m === "POST" && segments[0] === "auth" && segments[1] === "login") {
    return esperar({
      access_token: "mock-demo-token",
      token_type: "bearer",
    } satisfies LoginResponse as T);
  }

  if (m === "GET" && segments[0] === "terrenos" && segments.length === 1) {
    return esperar([...store.terrenos] as T);
  }

  if (m === "GET" && segments[0] === "terrenos" && segments.length === 2) {
    const t = store.terrenos.find((x) => x.id === segments[1]);
    if (!t) throw new ApiError(404, "Terreno não encontrado.");
    return esperar({ ...t } as T);
  }

  if (m === "GET" && segments[0] === "casas" && segments.length === 1) {
    return esperar([...store.casas] as T);
  }

  if (m === "GET" && segments[0] === "casas" && segments.length === 2) {
    const c = store.casas.find((x) => x.id === segments[1]);
    if (!c) throw new ApiError(404, "Casa não encontrada.");
    return esperar({ ...c } as T);
  }

  if (
    m === "GET" &&
    segments[0] === "casas" &&
    segments[2] === "moradores"
  ) {
    const lista = store.moradores.filter((x) => x.casa_id === segments[1]);
    return esperar([...lista] as T);
  }

  if (
    m === "GET" &&
    segments[0] === "casas" &&
    segments[2] === "cobrancas"
  ) {
    const comp = query.get("competencia") ?? store.alugueis[0]?.competencia ?? "";
    return esperar(cobrancasCasa(segments[1], comp) as T);
  }

  if (m === "GET" && segments[0] === "dashboard") {
    const comp = query.get("competencia") ?? store.alugueis[0]?.competencia ?? "";
    return esperar(dashboard(comp) as T);
  }

  if (m === "GET" && segments[0] === "relatorio") {
    const comp = query.get("competencia") ?? store.alugueis[0]?.competencia ?? "";
    return esperar(relatorio(comp) as T);
  }

  if (m === "GET" && segments[0] === "despesas") {
    const comp = query.get("competencia");
    const lista = comp
      ? store.despesas.filter((d) => d.data.startsWith(comp))
      : store.despesas;
    return esperar([...lista] as T);
  }

  if (m === "GET" && segments[0] === "contas" && segments.length === 2) {
    return esperar(contaDetalhe(segments[1]) as T);
  }

  if (m === "GET" && segments[0] === "config") {
    return esperar({ ...store.config } as T);
  }

  if (m === "PUT" && segments[0] === "config") {
    const b = body as { moradores_administradora?: number };
    store.config = {
      moradores_administradora: b.moradores_administradora ?? store.config.moradores_administradora,
    };
    return esperar({ ...store.config } as T);
  }

  if (
    m === "GET" &&
    segments[0] === "casas" &&
    segments.length === 3 &&
    segments[2] === "documentos"
  ) {
    return esperar(documentosCasa(segments[1]) as T);
  }

  if (
    m === "POST" &&
    segments[0] === "casas" &&
    segments.length === 4 &&
    segments[2] === "documentos" &&
    segments[3] === "pdfs"
  ) {
    const casa = store.casas.find((c) => c.id === segments[1]);
    if (!casa) throw new ApiError(404, "Casa não encontrada.");
    const b = body as {
      nome?: string;
      tamanho_bytes?: number;
      url?: string;
    };
    const pdf: DocumentoPdf = {
      id: `pdf-${Date.now()}`,
      casa_id: casa.id,
      nome: b.nome ?? "documento.pdf",
      tamanho_bytes: b.tamanho_bytes ?? 0,
      url: b.url ?? "",
      created_at: new Date().toISOString(),
    };
    store.pdfs.push(pdf);
    return esperar(pdf as T);
  }

  if (
    m === "POST" &&
    segments[0] === "casas" &&
    segments.length === 4 &&
    segments[2] === "documentos" &&
    segments[3] === "fotos"
  ) {
    const casa = store.casas.find((c) => c.id === segments[1]);
    if (!casa) throw new ApiError(404, "Casa não encontrada.");
    const b = body as { legenda?: string | null; url?: string };
    const foto: FotoCasa = {
      id: `foto-${Date.now()}`,
      casa_id: casa.id,
      legenda: b.legenda?.trim() || null,
      url: b.url ?? "",
      created_at: new Date().toISOString(),
    };
    store.fotos.push(foto);
    return esperar(foto as T);
  }

  if (
    m === "POST" &&
    segments[0] === "casas" &&
    segments.length === 4 &&
    segments[2] === "documentos" &&
    segments[3] === "anotacoes"
  ) {
    const casa = store.casas.find((c) => c.id === segments[1]);
    if (!casa) throw new ApiError(404, "Casa não encontrada.");
    const b = body as { titulo?: string; texto?: string };
    const agora = new Date().toISOString();
    const nota: AnotacaoDocumento = {
      id: `nota-${Date.now()}`,
      casa_id: casa.id,
      titulo: b.titulo?.trim() || "Sem título",
      texto: b.texto?.trim() || "",
      created_at: agora,
      updated_at: agora,
    };
    store.anotacoes.push(nota);
    return esperar(nota as T);
  }

  if (m === "PUT" && segments[0] === "documentos" && segments[1] === "anotacoes" && segments[2]) {
    const nota = store.anotacoes.find((a) => a.id === segments[2]);
    if (!nota) throw new ApiError(404, "Anotação não encontrada.");
    const b = body as { titulo?: string; texto?: string };
    if (b.titulo !== undefined) nota.titulo = b.titulo.trim() || "Sem título";
    if (b.texto !== undefined) nota.texto = b.texto.trim();
    nota.updated_at = new Date().toISOString();
    return esperar({ ...nota } as T);
  }

  if (m === "DELETE" && segments[0] === "documentos" && segments[1] === "pdfs" && segments[2]) {
    const idx = store.pdfs.findIndex((p) => p.id === segments[2]);
    if (idx < 0) throw new ApiError(404, "PDF não encontrado.");
    store.pdfs.splice(idx, 1);
    return esperar(undefined as T);
  }

  if (m === "DELETE" && segments[0] === "documentos" && segments[1] === "fotos" && segments[2]) {
    const idx = store.fotos.findIndex((f) => f.id === segments[2]);
    if (idx < 0) throw new ApiError(404, "Foto não encontrada.");
    store.fotos.splice(idx, 1);
    return esperar(undefined as T);
  }

  if (
    m === "DELETE" &&
    segments[0] === "documentos" &&
    segments[1] === "anotacoes" &&
    segments[2]
  ) {
    const idx = store.anotacoes.findIndex((a) => a.id === segments[2]);
    if (idx < 0) throw new ApiError(404, "Anotação não encontrada.");
    store.anotacoes.splice(idx, 1);
    return esperar(undefined as T);
  }

  if (m === "PATCH" && segments[0] === "alugueis" && segments[2] === "pagamento") {
    const a = store.alugueis.find((x) => x.id === segments[1]);
    if (!a) throw new ApiError(404, "Aluguel não encontrado.");
    const b = body as { pago?: boolean };
    a.pago = !!b.pago;
    a.pago_em = a.pago ? new Date().toISOString() : null;
    a.atrasado = !a.pago && (diasParaVencer(a.vencimento) ?? 0) < 0;
    return esperar(undefined as T);
  }

  if (m === "PATCH" && segments[0] === "rateios" && segments[2] === "pagamento") {
    const r = store.rateios.find((x) => x.id === segments[1]);
    if (!r) throw new ApiError(404, "Rateio não encontrado.");
    const b = body as { pago?: boolean };
    r.pago = !!b.pago;
    r.pago_em = r.pago ? new Date().toISOString() : null;
    return esperar(undefined as T);
  }

  if (m === "POST") {
    return esperar({ ok: true, id: `mock-${Date.now()}` } as T);
  }

  if (m === "DELETE") {
    return esperar(undefined as T);
  }

  throw new ApiError(0, `Mock: rota não implementada (${m} ${path}).`);
}
