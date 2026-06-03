const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Converte centavos (inteiro) para "R$ 1.234,56". */
export function formatarCentavos(centavos: number): string {
  return brl.format((centavos ?? 0) / 100);
}

/** Converte um texto digitado ("1.234,56" ou "1234,5") para centavos inteiros. */
export function paraCentavos(texto: string): number {
  if (!texto) return 0;
  const limpo = texto.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const valor = Number.parseFloat(limpo);
  if (Number.isNaN(valor)) return 0;
  return Math.round(valor * 100);
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Competência "AAAA-MM" -> "Junho de 2026". */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes) return competencia;
  return `${MESES[mes - 1]} de ${ano}`;
}

/** Competência do mês atual no formato "AAAA-MM". */
export function competenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/** Soma `delta` meses a uma competência "AAAA-MM". */
export function deslocarCompetencia(competencia: string, delta: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Data de hoje no formato ISO "AAAA-MM-DD". */
export function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "2026-06-10" -> "10/06". */
export function formatarDiaMes(iso: string | null): string {
  if (!iso) return "";
  const [, mes, dia] = iso.split("-");
  if (!dia || !mes) return iso;
  return `${dia}/${mes}`;
}
