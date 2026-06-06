import { handleMockRequest, USE_MOCK } from "./mock";

const BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://controle-casas-api.onrender.com";

const TOKEN_KEY = "casaemdia_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Disparado quando uma chamada recebe 401 (sessão inválida/expirada). */
export const onUnauthorized = new EventTarget();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK) {
    const method = options.method ?? "GET";
    const body = options.body
      ? (JSON.parse(options.body as string) as unknown)
      : undefined;
    return handleMockRequest<T>(method, path, body);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Tente novamente.");
  }

  if (res.status === 401) {
    clearToken();
    onUnauthorized.dispatchEvent(new Event("unauthorized"));
    throw new ApiError(401, "Sessão expirada. Faça login novamente.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      (data && (data.detail as string)) || `Erro ${res.status}. Tente novamente.`;
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ---------- Tipos da API ---------- */

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Terreno {
  id: string;
  nome: string;
  endereco: string | null;
  created_at: string;
  updated_at: string;
}

export interface Casa {
  id: string;
  terreno_id: string;
  nome: string;
  aluguel_centavos: number;
  dia_vencimento: number;
  ativo: boolean;
  observacoes: string | null;
  morador_adulto_nome?: string | null;
  moradores_atuais?: number;
  aluguel_formatado?: string;
  created_at: string;
  updated_at: string;
}

export interface Morador {
  id: string;
  casa_id: string;
  nome: string;
  telefone: string | null;
  responsavel: boolean;
  adulto: boolean;
  idade: number | null;
  parentesco: string | null;
  sexo: string | null;
  data_entrada: string;
  data_saida: string | null;
}

export type TipoPendencia = "ALUGUEL" | "AGUA" | "LUZ";

export interface ItemPendente {
  tipo: TipoPendencia;
  casa_id: string | null;
  casa_nome: string | null;
  competencia: string;
  valor_centavos: number;
  vencimento: string | null;
  atrasado: boolean;
  dias_para_vencer: number | null;
  vence_em_breve: boolean;
  aluguel_id: string | null;
  rateio_id: string | null;
}

export interface ItemCobranca {
  tipo: TipoPendencia;
  aluguel_id: string | null;
  rateio_id: string | null;
  conta_id: string | null;
  competencia: string;
  valor_centavos: number;
  valor_formatado: string;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
}

/** Confirma (ou desfaz) o recebimento de um aluguel. */
export function confirmarAluguel(id: string, pago: boolean) {
  return api.patch(`/alugueis/${id}/pagamento`, { pago });
}

/** Confirma (ou desfaz) o recebimento de um rateio de conta. */
export function confirmarRateio(id: string, pago: boolean) {
  return api.patch(`/rateios/${id}/pagamento`, { pago });
}

export interface Dashboard {
  competencia: string;
  competencia_formatada: string;
  total_em_aberto_centavos: number;
  qtd_itens_abertos: number;
  qtd_itens_atrasados: number;
  qtd_itens_proximos: number;
  pendencias: ItemPendente[];
}

export interface CasaRelatorio {
  casa_id: string;
  casa_nome: string;
  aluguel_centavos: number;
  agua_centavos: number;
  luz_centavos: number;
  total_devido_centavos: number;
  total_pago_centavos: number;
  em_aberto_centavos: number;
}

export interface AdministradoraItem {
  conta_id: string;
  tipo: TipoConta;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  terreno_nome: string | null;
}

export interface AdministradoraRelatorio {
  agua_centavos: number;
  luz_centavos: number;
  total_centavos: number;
  itens: AdministradoraItem[];
}

export interface Relatorio {
  competencia: string;
  competencia_formatada: string;
  casas: CasaRelatorio[];
  totais: {
    total_a_receber_centavos: number;
    total_recebido_centavos: number;
    total_em_aberto_centavos: number;
    total_despesas_centavos: number;
  };
  administradora: AdministradoraRelatorio;
}

export type TipoConta = "AGUA" | "LUZ";

export type CategoriaDespesa = "MANUTENCAO" | "REPARO" | "IMPOSTO" | "OUTROS";

export interface Aluguel {
  id: string;
  casa_id: string;
  competencia: string;
  valor_centavos: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  valor_formatado: string;
  atrasado: boolean;
}

export interface Rateio {
  id: string;
  conta_id: string;
  casa_id: string;
  casa_nome: string | null;
  pessoas_snapshot: number;
  valor_centavos: number;
  pago: boolean;
  pago_em: string | null;
}

export interface Conta {
  id: string;
  terreno_id: string;
  tipo: TipoConta;
  competencia: string;
  valor_total_centavos: number;
  vencimento: string;
  pessoas_administradora: number;
}

export interface ContaDetalhe extends Conta {
  rateios: Rateio[];
  valor_total_formatado: string;
  valor_administradora_centavos: number;
  valor_administradora_formatado: string;
}

export interface Configuracao {
  moradores_administradora: number;
}

export interface Despesa {
  id: string;
  terreno_id: string | null;
  casa_id: string | null;
  casa_nome: string | null;
  terreno_nome: string | null;
  descricao: string;
  categoria: CategoriaDespesa;
  valor_centavos: number;
  data: string;
  valor_formatado: string;
}

export interface DocumentoPdf {
  id: string;
  casa_id: string;
  nome: string;
  tamanho_bytes: number;
  url: string;
  created_at: string;
}

export interface FotoCasa {
  id: string;
  casa_id: string;
  legenda: string | null;
  url: string;
  created_at: string;
}

export interface AnotacaoDocumento {
  id: string;
  casa_id: string;
  titulo: string;
  texto: string;
  created_at: string;
  updated_at: string;
}

export interface CasaDocumentos {
  casa_id: string;
  casa_nome: string;
  pdfs: DocumentoPdf[];
  fotos: FotoCasa[];
  anotacoes: AnotacaoDocumento[];
}
