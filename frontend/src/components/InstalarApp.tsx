import { useEffect, useReducer, useState } from "react";
import { Alert } from "./Alert";
import { Icon } from "./Icon";
import {
  canPromptInstall,
  isIOS,
  isStandalone,
  onInstallChange,
  promptInstall,
} from "../lib/pwa";

export function InstalarApp() {
  const [, forcar] = useReducer((n) => n + 1, 0);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => onInstallChange(forcar), []);

  if (isStandalone()) {
    return (
      <Alert>
        O Casa em Dia já está instalado neste aparelho. Abra pelo ícone na tela
        inicial.
      </Alert>
    );
  }

  const podeInstalar = canPromptInstall();
  const ios = isIOS();

  async function instalar() {
    const r = await promptInstall();
    if (r === "accepted") {
      setResultado("App instalado! Procure o ícone na tela inicial.");
    } else if (r === "dismissed") {
      setResultado("Instalação cancelada. Você pode tentar de novo quando quiser.");
    }
  }

  return (
    <div className="install-page">
      <div className="install-hero">
        <img src="/icon.svg" width={72} height={72} alt="" />
        <div>
          <strong>Casa em Dia</strong>
          <span>Use como um app, direto da tela inicial.</span>
        </div>
      </div>

      {podeInstalar && (
        <div className="install-cta">
          <button className="btn" onClick={instalar}>
            <Icon name="plus" size={18} />
            Instalar agora
          </button>
          {resultado && (
            <p className="hint" style={{ textAlign: "center", marginTop: 8 }}>
              {resultado}
            </p>
          )}
        </div>
      )}

      {!podeInstalar && !ios && (
        <Alert>
          Para instalar, abra o site no navegador do celular (Chrome no Android
          ou Safari no iPhone) e siga o passo a passo abaixo.
        </Alert>
      )}

      <h3 className="install-os">
        <Icon name="building" size={16} /> iPhone (Safari)
      </h3>
      <ol className="install-steps">
        <li>
          Toque no botão <strong>Compartilhar</strong> (o quadrado com uma seta
          para cima), na barra do Safari.
        </li>
        <li>
          Role para baixo e escolha{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </li>
        <li>
          Toque em <strong>Adicionar</strong> no canto superior direito.
        </li>
      </ol>

      <h3 className="install-os">
        <Icon name="building" size={16} /> Android (Chrome)
      </h3>
      <ol className="install-steps">
        <li>
          Toque no <strong>menu de três pontos</strong> no canto superior
          direito.
        </li>
        <li>
          Escolha <strong>Instalar app</strong> ou{" "}
          <strong>Adicionar à tela inicial</strong>.
        </li>
        <li>
          Confirme tocando em <strong>Instalar</strong>.
        </li>
      </ol>
    </div>
  );
}
