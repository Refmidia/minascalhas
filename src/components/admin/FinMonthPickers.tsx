import { useEffect, useRef, useState } from "react";

import { finYmLabel } from "@/lib/financeiro-display";

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function compareYm(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

type FinYearPickerProps = {
  years: number[];
  value: number;
  onChange: (year: number) => void;
};

export function FinYearPicker({ years, value, onChange }: FinYearPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`fin-mpicker fin-mpicker--years${open ? " is-open" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="fin-mpicker__trigger fin-mensal__control"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="fin-ano-label fin-ypicker-text"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-calendar-event fin-mensal__input-icon" aria-hidden="true" />
        <span className="fin-mpicker__text" id="fin-ypicker-text">
          {value}
        </span>
        <i className="bi bi-chevron-down fin-mpicker__chevron" aria-hidden="true" />
      </button>
      <div
        className="fin-mpicker__popover fin-mpicker__popover--years"
        role="listbox"
        aria-label="Escolher ano"
        hidden={!open}
      >
        <div className="fin-mpicker__grid fin-mpicker__grid--years">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={`fin-mpicker__month fin-mpicker__year-btn${y === value ? " is-selected" : ""}`}
              role="option"
              aria-selected={y === value}
              onClick={() => {
                onChange(y);
                setOpen(false);
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type FinDesdePickerProps = {
  minYm: string;
  maxYm: string;
  value: string;
  onChange: (ym: string) => void;
};

export function FinDesdePicker({ minYm, maxYm, value, onChange }: FinDesdePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => intYmYear(value));
  const rootRef = useRef<HTMLDivElement>(null);

  const minYear = intYmYear(minYm) || new Date().getFullYear();
  const maxYear = intYmYear(maxYm) || new Date().getFullYear();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function isDisabled(ym: string) {
    return compareYm(ym, minYm) < 0 || compareYm(ym, maxYm) > 0;
  }

  function apply(ym: string) {
    if (!ym || isDisabled(ym)) return;
    onChange(ym);
    setOpen(false);
  }

  function renderMonths() {
    const cells = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      const ym = `${viewYear}-${mm}`;
      const disabled = isDisabled(ym);
      cells.push(
        <button
          key={ym}
          type="button"
          className={`fin-mpicker__month${ym === value ? " is-selected" : ""}`}
          role="gridcell"
          aria-label={`${MONTH_LONG[m - 1]} de ${viewYear}`}
          disabled={disabled}
          onClick={() => apply(ym)}
        >
          {MONTH_SHORT[m - 1]}
        </button>,
      );
    }
    return cells;
  }

  return (
    <div
      ref={rootRef}
      className={`fin-mpicker${open ? " is-open" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="fin-mpicker__trigger fin-mensal__control"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby="fin-desde-label fin-mpicker-text"
        onClick={() => {
          setViewYear(Math.min(maxYear, Math.max(minYear, intYmYear(value))));
          setOpen((v) => !v);
        }}
      >
        <i className="bi bi-calendar-month fin-mensal__input-icon" aria-hidden="true" />
        <span className="fin-mpicker__text" id="fin-mpicker-text">
          {finYmLabel(value)}
        </span>
        <i className="bi bi-chevron-down fin-mpicker__chevron" aria-hidden="true" />
      </button>
      <div className="fin-mpicker__popover" role="dialog" aria-label="Escolher mês" hidden={!open}>
        <div className="fin-mpicker__head">
          <button
            type="button"
            className="fin-mpicker__nav"
            aria-label="Ano anterior"
            disabled={viewYear <= minYear}
            onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="fin-mpicker__year" aria-live="polite">
            {viewYear}
          </span>
          <button
            type="button"
            className="fin-mpicker__nav"
            aria-label="Próximo ano"
            disabled={viewYear >= maxYear}
            onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div className="fin-mpicker__grid" role="grid">
          {renderMonths()}
        </div>
        <div className="fin-mpicker__foot">
          <button
            type="button"
            className="fin-mpicker__foot-btn"
            onClick={() => apply(minYm)}
          >
            Desde o início
          </button>
          <button
            type="button"
            className="fin-mpicker__foot-btn fin-mpicker__foot-btn--primary"
            onClick={() => {
              const now = new Date();
              const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              apply(compareYm(ym, maxYm) > 0 ? maxYm : ym);
            }}
          >
            Este mês
          </button>
        </div>
      </div>
    </div>
  );
}

function intYmYear(ym: string): number {
  return parseInt(ym.slice(0, 4), 10) || new Date().getFullYear();
}
