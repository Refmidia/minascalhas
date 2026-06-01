const CHAVES = ["seg", "ter", "qua", "qui", "sex"] as const;
type Chave = (typeof CHAVES)[number];
type Estado = "diaria" | "empreita";

const NOME_PARA_CHAVE: Record<string, Chave> = {
  Seg: "seg",
  Ter: "ter",
  Qua: "qua",
  Qui: "qui",
  Sex: "sex",
};

type CelulaDia = { estado: Estado; dia: string; title: string };

function parseDiasPagosMap(texto: string): Record<Chave, CelulaDia | null> {
  const map = Object.fromEntries(CHAVES.map((k) => [k, null])) as Record<Chave, CelulaDia | null>;
  for (const part of texto.split(/,\s*/)) {
    const t = part.trim();
    if (!t) continue;
    const empreita = /\(empreita\)/i.test(t);
    const clean = t.replace(/\s*\(empreita\)/i, "").trim();
    const m = /^(Seg|Ter|Qua|Qui|Sex)\s+(\d{1,2})\/(\d{1,2})/.exec(clean);
    if (!m) continue;
    const chave = NOME_PARA_CHAVE[m[1]];
    if (!chave) continue;
    map[chave] = {
      estado: empreita ? "empreita" : "diaria",
      dia: m[2],
      title: t,
    };
  }
  return map;
}

export function DiasPagosStrip({ texto }: { texto: string }) {
  const map = parseDiasPagosMap(texto);
  const ativos = CHAVES.filter((k) => map[k] != null).length;
  if (ativos === 0) return <span className="dash-pag-func-table__empty">—</span>;

  return (
    <div className="dash-pag-dias-strip" title={texto} aria-label={`Dias pagos: ${texto}`}>
      {CHAVES.map((chave) => {
        const cell = map[chave];
        return (
          <span
            key={chave}
            className={`dash-pag-dias-strip__cell${cell ? ` is-${cell.estado}` : " is-off"}`}
            title={cell?.title ?? "Sem registro"}
          >
            <span className="dash-pag-dias-strip__num">{cell ? cell.dia : ""}</span>
          </span>
        );
      })}
    </div>
  );
}
