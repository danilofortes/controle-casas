import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * Renderizador de markdown mínimo (sem dependências) para textos curtos vindos
 * da IA. Cobre o que o modelo costuma gerar: **negrito**, *itálico*, `código`,
 * títulos (#, ##, ###) e listas com - ou *. Não usa dangerouslySetInnerHTML,
 * então é seguro contra injeção de HTML.
 */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts
    .filter((part) => part !== "")
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            style={{
              background: "var(--ui-line)",
              borderRadius: 4,
              padding: "1px 5px",
              fontSize: "0.9em",
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
}

interface Props {
  text: string;
  className?: string;
  style?: CSSProperties;
}

export function MarkdownLite({ text, className, style }: Props) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`ul-${key++}`} style={{ margin: "6px 0", paddingLeft: 20 }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: 4, lineHeight: 1.55 }}>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const content = renderInline(heading[2]);
      const level = heading[1].length;
      if (level === 1) {
        blocks.push(
          <h4 key={key++} style={{ margin: "10px 0 6px", fontSize: 15, fontWeight: 700 }}>
            {content}
          </h4>,
        );
      } else if (level === 2) {
        blocks.push(
          <h5 key={key++} style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 700 }}>
            {content}
          </h5>,
        );
      } else {
        blocks.push(
          <h6 key={key++} style={{ margin: "6px 0 4px", fontSize: 13, fontWeight: 700 }}>
            {content}
          </h6>,
        );
      }
      continue;
    }
    blocks.push(
      <p key={key++} style={{ margin: "0 0 8px", lineHeight: 1.6 }}>
        {renderInline(line)}
      </p>,
    );
  }
  flushList();

  return (
    <div className={className} style={style}>
      {blocks}
    </div>
  );
}
