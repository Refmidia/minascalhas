type Estado = "diaria" | "empreita";

type CelulaDia = { estado: Estado; dia: string; title: string };

function parseDiasPagosLista(texto: string): CelulaDia[] {
  const out: CelulaDia[] = [];
  const re = /(\d{1,2})\/(\d{1,2})(?:\s*\((empreita)\))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    out.push({
      estado: m[3] ? "empreita" : "diaria",
      dia: String(Number(m[1])),
      title: m[0].trim(),
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
    </div>
  );
}
