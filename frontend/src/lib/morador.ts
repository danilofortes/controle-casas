export type ParentescoMorador =
  | "conjuge"
  | "filho"
  | "filha"
  | "pai"
  | "mae"
  | "irmao"
  | "irma"
  | "neto"
  | "neta"
  | "outro";

export type SexoMorador = "masculino" | "feminino" | "outro";

export const PARENTESCO_OPCOES: { value: ParentescoMorador; label: string }[] = [
  { value: "conjuge", label: "Cônjuge" },
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "irmao", label: "Irmão" },
  { value: "irma", label: "Irmã" },
  { value: "neto", label: "Neto" },
  { value: "neta", label: "Neta" },
  { value: "outro", label: "Outro" },
];

export const SEXO_OPCOES: { value: SexoMorador; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

export function rotuloParentesco(valor: string | null | undefined): string {
  if (!valor) return "Não informado";
  return PARENTESCO_OPCOES.find((o) => o.value === valor)?.label ?? valor;
}

export function rotuloSexo(valor: string | null | undefined): string {
  if (!valor) return "Não informado";
  return SEXO_OPCOES.find((o) => o.value === valor)?.label ?? valor;
}
