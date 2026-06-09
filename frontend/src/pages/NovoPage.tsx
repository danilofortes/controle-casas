import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon, type IconName } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { FinanceBot } from "../components/FinanceBot";
import {
  AluguelForm,
  CasaForm,
  ContaForm,
  DespesaForm,
  MoradorForm,
  TerrenoForm,
} from "../components/forms/EntityForms";

export type FormKey =
  | "terreno"
  | "casa"
  | "morador"
  | "aluguel"
  | "agua"
  | "luz"
  | "despesa";

const FORM_KEYS: FormKey[] = [
  "terreno",
  "casa",
  "morador",
  "aluguel",
  "agua",
  "luz",
  "despesa",
];

const OPCOES: { key: FormKey; icon: IconName; titulo: string; desc: string }[] = [
  { key: "terreno", icon: "map", titulo: "Novo terreno", desc: "Cadastrar um lote/terreno" },
  { key: "casa", icon: "building", titulo: "Nova casa", desc: "Adicionar casa a um terreno" },
  { key: "morador", icon: "users", titulo: "Novo morador", desc: "Registrar morador em uma casa" },
  { key: "aluguel", icon: "key", titulo: "Cobrança de aluguel", desc: "Lançar aluguel do mês" },
  { key: "agua", icon: "water", titulo: "Conta de água", desc: "Lançar e ratear por morador" },
  { key: "luz", icon: "bolt", titulo: "Conta de luz", desc: "Lançar e ratear por morador" },
  { key: "despesa", icon: "receipt", titulo: "Despesa", desc: "Registrar um gasto" },
];

const TITULOS: Record<FormKey, string> = {
  terreno: "Novo terreno",
  casa: "Nova casa",
  morador: "Novo morador",
  aluguel: "Cobrança de aluguel",
  agua: "Conta de água",
  luz: "Conta de luz",
  despesa: "Nova despesa",
};

export function NovoPage() {
  const [aberto, setAberto] = useState<FormKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const location = useLocation();

  // Abre automaticamente um formulário quando navegado com { state: { form } }.
  useEffect(() => {
    const form = (location.state as { form?: FormKey } | null)?.form;
    if (form && FORM_KEYS.includes(form)) {
      setAberto(form);
    }
  }, [location.state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function aoSalvar(msg: string) {
    setAberto(null);
    setToast(msg);
  }

  function renderForm(key: FormKey) {
    switch (key) {
      case "terreno":
        return <TerrenoForm onSaved={aoSalvar} />;
      case "casa":
        return <CasaForm onSaved={aoSalvar} />;
      case "morador":
        return <MoradorForm onSaved={aoSalvar} />;
      case "aluguel":
        return <AluguelForm onSaved={aoSalvar} />;
      case "agua":
        return <ContaForm tipo="AGUA" onSaved={aoSalvar} />;
      case "luz":
        return <ContaForm tipo="LUZ" onSaved={aoSalvar} />;
      case "despesa":
        return <DespesaForm onSaved={aoSalvar} />;
    }
  }

  return (
    <div className="ui-page">
      {toast && <div className="toast">{toast}</div>}

      <PageHeader
        title="Novo lançamento"
        subtitle="Cadastre terreno, casa, morador ou cobrança"
        showNovo={false}
      />

      <div className="ui-panel">
        <FinanceBot variant="list" />
        {OPCOES.map((o) => (
          <button
            className="list-item list-item-btn"
            key={o.key}
            onClick={() => setAberto(o.key)}
          >
            <div className="badge-icon">
              <Icon name={o.icon} size={22} />
            </div>
            <div className="li-main">
              <div className="li-title">{o.titulo}</div>
              <div className="li-sub">{o.desc}</div>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>
        ))}
      </div>

      {aberto && (
        <Modal title={TITULOS[aberto]} onClose={() => setAberto(null)}>
          {renderForm(aberto)}
        </Modal>
      )}
    </div>
  );
}
