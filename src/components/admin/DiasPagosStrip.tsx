type Estado = "diaria" | "empreita";

type CelulaDia = { estado: Estado; dia: string; title: string };

function parseDiasPagosLista(texto: string): CelulaDia[] {
  const out: CelulaDia[] = [];
  for (const part of texto.split(/,\s*/)) {
    const t = part.trim();
    if (!t) continue;
    const empreita = /\(empreita\)/i.test(t);
    const clean = t.replace(/\s*\(empreita\)/i, "").trim();
    const m = /\b(\d{1,2})\/(\d{1,2})\b/.exec(clean);
    out.push({
      estado: empreita ? "empreita" : "diaria",
      dia: m?.[1] ?? "?",
      title: t,
    });
  }
  return out;
}

export function DiasPagosStrip({ texto }: { texto: string }) {
  const lista = parseDiasPagosLista(texto);
  if (lista.length === 0) return <span className="dash-pag-func-table__empty">—</span>;

  return (
    <div className="dash-pag-dias-strip-wrap" title={texto}>
      <div className="dash-pag-dias-strip" aria-label={`Dias pagos: ${texto}`}>
        {lista.map((cell, i) => (
          <span
            key={`${cell.dia}-${i}`}
            className={`dash-pag-dias-strip__cell is-${cell.estado}`}
            title={cell.title}
          >
            <span className="dash-pag-dias-strip__num">{cell.dia}</span>
          </span>
        ))}
      </div>
      {lista.length > 6 ? (
        <span className="dash-pag-dias-strip__qtd" aria-hidden="true">
          {lista.length}
        </span>
      ) : null}
    </div>
  );
}
