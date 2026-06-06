import { formatarCentavos, competenciaAtual } from "../format";
import type {
  Aluguel,
  AnotacaoDocumento,
  Casa,
  Configuracao,
  Conta,
  Despesa,
  DocumentoPdf,
  FotoCasa,
  Morador,
  Rateio,
  Terreno,
  TipoConta,
} from "../api";

const AGORA = competenciaAtual();
const TS = "2026-01-15T10:00:00Z";

export const MOCK_TOKEN = "mock-demo-token";

export interface MockStore {
  terrenos: Terreno[];
  casas: Casa[];
  moradores: Morador[];
  alugueis: Aluguel[];
  contas: Conta[];
  rateios: Rateio[];
  despesas: Despesa[];
  config: Configuracao;
  pdfs: DocumentoPdf[];
  fotos: FotoCasa[];
  anotacoes: AnotacaoDocumento[];
}

function criarStore(): MockStore {
  const terreno: Terreno = {
    id: "t-rua-flores",
    nome: "Terreno Rua das Flores",
    endereco: "Rua das Flores, 120",
    created_at: TS,
    updated_at: TS,
  };

  const casas: Casa[] = [
    {
      id: "c-joao",
      terreno_id: terreno.id,
      nome: "Casa do João",
      aluguel_centavos: 850_00,
      dia_vencimento: 5,
      ativo: true,
      observacoes: null,
      created_at: TS,
      updated_at: TS,
    },
    {
      id: "c-ana",
      terreno_id: terreno.id,
      nome: "Casa da Ana",
      aluguel_centavos: 650_00,
      dia_vencimento: 10,
      ativo: true,
      observacoes: null,
      created_at: TS,
      updated_at: TS,
    },
    {
      id: "c-carlos",
      terreno_id: terreno.id,
      nome: "Casa do Carlos",
      aluguel_centavos: 920_00,
      dia_vencimento: 5,
      ativo: true,
      observacoes: null,
      created_at: TS,
      updated_at: TS,
    },
  ];

  const moradores: Morador[] = [
    {
      id: "m-joao",
      casa_id: "c-joao",
      nome: "João Silva",
      telefone: "(11) 98765-4321",
      responsavel: true,
      adulto: true,
      idade: 38,
      data_entrada: "2024-03-01",
      data_saida: null,
    },
    {
      id: "m-maria",
      casa_id: "c-joao",
      nome: "Maria Silva",
      telefone: null,
      responsavel: false,
      adulto: true,
      idade: 35,
      data_entrada: "2024-03-01",
      data_saida: null,
    },
    {
      id: "m-pedro",
      casa_id: "c-joao",
      nome: "Pedro Silva",
      telefone: null,
      responsavel: false,
      adulto: false,
      idade: 9,
      data_entrada: "2024-03-01",
      data_saida: null,
    },
    {
      id: "m-ana",
      casa_id: "c-ana",
      nome: "Ana Costa",
      telefone: "(11) 91234-5678",
      responsavel: true,
      adulto: true,
      idade: 29,
      data_entrada: "2025-01-10",
      data_saida: null,
    },
    {
      id: "m-carlos",
      casa_id: "c-carlos",
      nome: "Carlos Mendes",
      telefone: "(11) 99876-5432",
      responsavel: true,
      adulto: true,
      idade: 42,
      data_entrada: "2023-08-15",
      data_saida: null,
    },
    {
      id: "m-lucia",
      casa_id: "c-carlos",
      nome: "Lúcia Mendes",
      telefone: null,
      responsavel: false,
      adulto: true,
      idade: 40,
      data_entrada: "2023-08-15",
      data_saida: null,
    },
  ];

  const [ano, mes] = AGORA.split("-").map(Number);
  const venc = (dia: number) =>
    `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const alugueis: Aluguel[] = casas.map((c, i) => {
    const vencimento = i === 2 ? venc(3) : venc(c.dia_vencimento);
    return {
      id: `a-${c.id}`,
      casa_id: c.id,
      competencia: AGORA,
      valor_centavos: c.aluguel_centavos,
      vencimento,
      pago: i === 0,
      pago_em: i === 0 ? `${vencimento}T12:00:00Z` : null,
      valor_formatado: formatarCentavos(c.aluguel_centavos),
      atrasado: i === 2,
    };
  });

  const contas: Conta[] = [
    {
      id: "ct-agua",
      terreno_id: terreno.id,
      tipo: "AGUA" as TipoConta,
      competencia: AGORA,
      valor_total_centavos: 18_000,
      vencimento: venc(15),
      pessoas_administradora: 4,
    },
    {
      id: "ct-luz",
      terreno_id: terreno.id,
      tipo: "LUZ" as TipoConta,
      competencia: AGORA,
      valor_total_centavos: 24_000,
      vencimento: venc(20),
      pessoas_administradora: 4,
    },
  ];

  const rateios: Rateio[] = [
    {
      id: "r-agua-joao",
      conta_id: "ct-agua",
      casa_id: "c-joao",
      casa_nome: "Casa do João",
      pessoas_snapshot: 2,
      valor_centavos: 4_500,
      pago: false,
      pago_em: null,
    },
    {
      id: "r-agua-ana",
      conta_id: "ct-agua",
      casa_id: "c-ana",
      casa_nome: "Casa da Ana",
      pessoas_snapshot: 1,
      valor_centavos: 3_500,
      pago: false,
      pago_em: null,
    },
    {
      id: "r-agua-carlos",
      conta_id: "ct-agua",
      casa_id: "c-carlos",
      casa_nome: "Casa do Carlos",
      pessoas_snapshot: 2,
      valor_centavos: 5_000,
      pago: true,
      pago_em: `${venc(12)}T10:00:00Z`,
    },
    {
      id: "r-luz-joao",
      conta_id: "ct-luz",
      casa_id: "c-joao",
      casa_nome: "Casa do João",
      pessoas_snapshot: 2,
      valor_centavos: 6_200,
      pago: true,
      pago_em: `${venc(14)}T10:00:00Z`,
    },
    {
      id: "r-luz-ana",
      conta_id: "ct-luz",
      casa_id: "c-ana",
      casa_nome: "Casa da Ana",
      pessoas_snapshot: 1,
      valor_centavos: 4_800,
      pago: false,
      pago_em: null,
    },
    {
      id: "r-luz-carlos",
      conta_id: "ct-luz",
      casa_id: "c-carlos",
      casa_nome: "Casa do Carlos",
      pessoas_snapshot: 2,
      valor_centavos: 7_100,
      pago: false,
      pago_em: null,
    },
  ];

  const despesas: Despesa[] = [
    {
      id: "d-portao",
      terreno_id: terreno.id,
      casa_id: null,
      casa_nome: null,
      terreno_nome: terreno.nome,
      descricao: "Conserto do portão",
      categoria: "REPARO",
      valor_centavos: 15_000,
      data: venc(2),
      valor_formatado: formatarCentavos(15_000),
    },
    {
      id: "d-iptu",
      terreno_id: terreno.id,
      casa_id: null,
      casa_nome: null,
      terreno_nome: terreno.nome,
      descricao: "IPTU do terreno",
      categoria: "IMPOSTO",
      valor_centavos: 32_000,
      data: venc(1),
      valor_formatado: formatarCentavos(32_000),
    },
  ];

  const PDF_DEMO =
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  const pdfs: DocumentoPdf[] = [
    {
      id: "pdf-joao-contrato",
      casa_id: "c-joao",
      nome: "Contrato_aluguel_Joao.pdf",
      tamanho_bytes: 245_760,
      url: PDF_DEMO,
      created_at: "2024-03-01T10:00:00Z",
    },
    {
      id: "pdf-joao-vistoria",
      casa_id: "c-joao",
      nome: "Vistoria_entrada_2024.pdf",
      tamanho_bytes: 1_048_576,
      url: PDF_DEMO,
      created_at: "2024-02-28T15:30:00Z",
    },
    {
      id: "pdf-joao-fianca",
      casa_id: "c-joao",
      nome: "Comprovante_caucao.pdf",
      tamanho_bytes: 89_432,
      url: PDF_DEMO,
      created_at: "2024-03-01T11:20:00Z",
    },
    {
      id: "pdf-joao-iptu",
      casa_id: "c-joao",
      nome: "IPTU_2025_cota_unica.pdf",
      tamanho_bytes: 156_800,
      url: PDF_DEMO,
      created_at: "2025-01-08T09:00:00Z",
    },
    {
      id: "pdf-ana-contrato",
      casa_id: "c-ana",
      nome: "Contrato_Ana_Costa.pdf",
      tamanho_bytes: 312_400,
      url: PDF_DEMO,
      created_at: "2025-01-10T14:00:00Z",
    },
    {
      id: "pdf-ana-vistoria",
      casa_id: "c-ana",
      nome: "Laudo_vistoria_jan2025.pdf",
      tamanho_bytes: 890_112,
      url: PDF_DEMO,
      created_at: "2025-01-09T16:45:00Z",
    },
    {
      id: "pdf-ana-recibo",
      casa_id: "c-ana",
      nome: "Recibo_dezembro_2025.pdf",
      tamanho_bytes: 42_300,
      url: PDF_DEMO,
      created_at: "2025-12-05T08:30:00Z",
    },
    {
      id: "pdf-carlos-contrato",
      casa_id: "c-carlos",
      nome: "Contrato_Carlos_Mendes.pdf",
      tamanho_bytes: 278_900,
      url: PDF_DEMO,
      created_at: "2023-06-15T10:00:00Z",
    },
    {
      id: "pdf-carlos-vistoria",
      casa_id: "c-carlos",
      nome: "Vistoria_entrada.pdf",
      tamanho_bytes: 512_000,
      url: PDF_DEMO,
      created_at: "2026-01-05T09:30:00Z",
    },
    {
      id: "pdf-carlos-aditivo",
      casa_id: "c-carlos",
      nome: "Aditivo_reajuste_2025.pdf",
      tamanho_bytes: 67_200,
      url: PDF_DEMO,
      created_at: "2025-06-01T12:00:00Z",
    },
    {
      id: "pdf-carlos-seguro",
      casa_id: "c-carlos",
      nome: "Apolice_seguro_incendio.pdf",
      tamanho_bytes: 198_500,
      url: PDF_DEMO,
      created_at: "2025-03-20T11:15:00Z",
    },
  ];

  const fotos: FotoCasa[] = [
    {
      id: "foto-joao-fachada",
      casa_id: "c-joao",
      legenda: "Fachada principal",
      url: "https://picsum.photos/seed/casa-joao-fachada/640/480",
      created_at: "2024-03-01T11:00:00Z",
    },
    {
      id: "foto-joao-sala",
      casa_id: "c-joao",
      legenda: "Sala de estar",
      url: "https://picsum.photos/seed/casa-joao-sala/640/480",
      created_at: "2024-03-01T11:05:00Z",
    },
    {
      id: "foto-joao-cozinha",
      casa_id: "c-joao",
      legenda: "Cozinha",
      url: "https://picsum.photos/seed/casa-joao-cozinha/640/480",
      created_at: "2024-03-01T11:10:00Z",
    },
    {
      id: "foto-joao-medidor",
      casa_id: "c-joao",
      legenda: "Medidor de água",
      url: "https://picsum.photos/seed/casa-joao-medidor/640/480",
      created_at: "2025-11-15T08:00:00Z",
    },
    {
      id: "foto-ana-fachada",
      casa_id: "c-ana",
      legenda: "Entrada da casa",
      url: "https://picsum.photos/seed/casa-ana-fachada/640/480",
      created_at: "2025-01-10T15:00:00Z",
    },
    {
      id: "foto-ana-quarto",
      casa_id: "c-ana",
      legenda: "Quarto da frente",
      url: "https://picsum.photos/seed/casa-ana-quarto/640/480",
      created_at: "2025-01-10T15:10:00Z",
    },
    {
      id: "foto-ana-banheiro",
      casa_id: "c-ana",
      legenda: "Banheiro social",
      url: "https://picsum.photos/seed/casa-ana-banheiro/640/480",
      created_at: "2025-01-10T15:20:00Z",
    },
    {
      id: "foto-ana-quintal",
      casa_id: "c-ana",
      legenda: "Quintal nos fundos",
      url: "https://picsum.photos/seed/casa-ana-quintal/640/480",
      created_at: "2025-06-20T10:30:00Z",
    },
    {
      id: "foto-carlos-fachada",
      casa_id: "c-carlos",
      legenda: "Fachada e garagem",
      url: "https://picsum.photos/seed/casa-carlos-fachada/640/480",
      created_at: "2023-06-15T14:00:00Z",
    },
    {
      id: "foto-carlos-sala",
      casa_id: "c-carlos",
      legenda: "Sala ampla",
      url: "https://picsum.photos/seed/casa-carlos-sala/640/480",
      created_at: "2023-06-15T14:10:00Z",
    },
    {
      id: "foto-carlos-garagem",
      casa_id: "c-carlos",
      legenda: "Vaga coberta",
      url: "https://picsum.photos/seed/casa-carlos-garagem/640/480",
      created_at: "2026-01-05T10:00:00Z",
    },
    {
      id: "foto-carlos-telhado",
      casa_id: "c-carlos",
      legenda: "Telhado após reforma",
      url: "https://picsum.photos/seed/casa-carlos-telhado/640/480",
      created_at: "2025-09-12T16:40:00Z",
    },
  ];

  const anotacoes: AnotacaoDocumento[] = [
    {
      id: "nota-joao-chave",
      casa_id: "c-joao",
      titulo: "Cópia da chave",
      texto: "Segunda via com o vizinho da casa 12. Devolver ao sair.",
      created_at: "2024-03-05T08:00:00Z",
      updated_at: "2024-03-05T08:00:00Z",
    },
    {
      id: "nota-joao-agua",
      casa_id: "c-joao",
      titulo: "Leitura do hidrômetro",
      texto: "Medidor fica no corredor lateral. Foto mensal antes do dia 3 para rateio.",
      created_at: "2025-02-01T09:00:00Z",
      updated_at: "2025-11-15T08:30:00Z",
    },
    {
      id: "nota-joao-reforma",
      casa_id: "c-joao",
      titulo: "Pintura externa",
      texto: "Combinado com João: ele paga metade do material, família paga mão de obra.",
      created_at: "2025-08-10T14:20:00Z",
      updated_at: "2025-08-10T14:20:00Z",
    },
    {
      id: "nota-ana-pintura",
      casa_id: "c-ana",
      titulo: "Pintura agendada",
      texto: "Pintor confirmado para março. Combinar data com a inquilina.",
      created_at: "2026-01-12T10:15:00Z",
      updated_at: "2026-01-12T10:15:00Z",
    },
    {
      id: "nota-ana-animais",
      casa_id: "c-ana",
      titulo: "Pet permitido",
      texto: "Contrato permite 1 cachorro pequeno. Ana tem a Luna, vira-lata.",
      created_at: "2025-01-10T16:00:00Z",
      updated_at: "2025-01-10T16:00:00Z",
    },
    {
      id: "nota-ana-vizinho",
      casa_id: "c-ana",
      titulo: "Contato do vizinho",
      texto: "Se precisar acessar o quintal dos fundos, falar com Seu Raimundo (casa 8).",
      created_at: "2025-04-22T11:00:00Z",
      updated_at: "2025-04-22T11:00:00Z",
    },
    {
      id: "nota-carlos-garagem",
      casa_id: "c-carlos",
      titulo: "Uso da garagem",
      texto: "Carlos guarda moto na vaga. Carro da família não entra nesse horário.",
      created_at: "2023-06-20T10:00:00Z",
      updated_at: "2024-11-03T09:45:00Z",
    },
    {
      id: "nota-carlos-reajuste",
      casa_id: "c-carlos",
      titulo: "Reajuste 2025",
      texto: "IGP-M aplicado em junho. Novo valor R$ 920. Aditivo assinado e arquivado.",
      created_at: "2025-06-02T08:00:00Z",
      updated_at: "2025-06-02T08:00:00Z",
    },
    {
      id: "nota-carlos-telhado",
      casa_id: "c-carlos",
      titulo: "Reforma do telhado",
      texto: "Troca de telhas em set/2025. Garantia de 2 anos com a empreiteira Silva.",
      created_at: "2025-09-15T17:30:00Z",
      updated_at: "2025-09-15T17:30:00Z",
    },
  ];

  return {
    terrenos: [terreno],
    casas,
    moradores,
    alugueis,
    contas,
    rateios,
    despesas,
    config: { moradores_administradora: 4 },
    pdfs,
    fotos,
    anotacoes,
  };
}

export let store: MockStore = criarStore();

export function resetMockStore(): void {
  store = criarStore();
}
