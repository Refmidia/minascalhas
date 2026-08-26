import { useEffect, useId, useRef, useState } from "react";

import { formatIsoDataBr, formatMesPonto } from "@/lib/ponto-relatorio";
import { pontoHojeIso } from "@/lib/ponto-timezone";

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function ymYear(ym: string): number {
  return Number.parseInt(ym.slice(0, 4), 10) || new Date().getFullYear();
}

function clampYm(ym: string, minYm: string, maxYm: string): string {
  if (ym < minYm) return minYm;
  if (ym > maxYm) return maxYm;
  return ym;
}

function usePickerOpen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

  return { rootRef, open, setOpen };
}

type MonthPickerProps = {
  id?: string;
  value: string;
  onChange: (ym: string) => void;
  minYm?: string;
  maxYm?: string;
};

export function DashMonthPicker({ id, value, onChange, minYm, maxYm }: MonthPickerProps) {
  const uid = useId();
  const textId = `${id ?? uid}-text`;
  const hoje = pontoHojeIso();
  const min = minYm ?? `${Number(hoje.slice(0, 4)) - 4}-01`;
  const max = maxYm ?? hoje.slice(0, 7);
  const { rootRef, open, setOpen } = usePickerOpen();
  const [viewYear, setViewYear] = useState(() => ymYear(value || max));
  const minYear = ymYear(min);
  const maxYear = ymYear(max);

  function apply(ym: string) {
    const next = clampYm(ym, min, max);
    onChange(next);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`fin-mpicker dash-dpicker${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        id={id}
        className="fin-mpicker__trigger fin-mensal__control dash-edit-modal__input"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={textId}
        onClick={() => {
          setViewYear(Math.min(maxYear, Math.max(minYear, ymYear(value || max))));
          setOpen((v) => !v);
        }}
      >
        <i className="bi bi-calendar-month fin-mensal__input-icon" aria-hidden="true" />
        <span className="fin-mpicker__text" id={textId}>
          {formatMesPonto(value || max)}
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
          {MONTH_SHORT.map((label, i) => {
            const ym = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
            const disabled = ym < min || ym > max;
            return (
              <button
                key={ym}
                type="button"
                className={`fin-mpicker__month${ym === value ? " is-selected" : ""}`}
                disabled={disabled}
                onClick={() => apply(ym)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="fin-mpicker__foot">
          <span />
          <button
            type="button"
            className="fin-mpicker__foot-btn fin-mpicker__foot-btn--primary"
            onClick={() => apply(max)}
          >
            Este mês
          </button>
        </div>
      </div>
    </div>
  );
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
};

export function DashDatePicker({ id, value, onChange, min, max }: DatePickerProps) {
  const uid = useId();
  const textId = `${id ?? uid}-text`;
  const hoje = pontoHojeIso();
  const { rootRef, open, setOpen } = usePickerOpen();
  const [view, setView] = useState(() => (value || hoje).slice(0, 7));

  const year = Number(view.slice(0, 4));
  const month = Number(view.slice(5, 7));
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysCount = new Date(year, month, 0).getDate();

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setView(ym);
  }

  function apply(iso: string) {
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setOpen(false);
  }

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) {
    cells.push({
      iso: `${view}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }

  return (
    <div
      ref={rootRef}
      className={`fin-mpicker dash-dpicker${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        id={id}
        className="fin-mpicker__trigger fin-mensal__control dash-edit-modal__input"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={textId}
        onClick={() => {
          setView((value || hoje).slice(0, 7));
          setOpen((v) => !v);
        }}
      >
        <i className="bi bi-calendar3 fin-mensal__input-icon" aria-hidden="true" />
        <span className="fin-mpicker__text" id={textId}>
          {value ? formatIsoDataBr(value) : "—"}
        </span>
        <i className="bi bi-chevron-down fin-mpicker__chevron" aria-hidden="true" />
      </button>
      <div className="fin-mpicker__popover dash-dpicker__popover" role="dialog" aria-label="Escolher data" hidden={!open}>
        <div className="fin-mpicker__head">
          <button type="button" className="fin-mpicker__nav" aria-label="Mês anterior" onClick={() => shiftMonth(-1)}>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="fin-mpicker__year" aria-live="polite">
            {formatMesPonto(view)}
          </span>
          <button type="button" className="fin-mpicker__nav" aria-label="Próximo mês" onClick={() => shiftMonth(1)}>
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div className="dash-dpicker__week">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="dash-dpicker__grid" role="grid">
          {cells.map((cell, i) => {
            if (!cell) return <span key={`e-${i}`} className="dash-dpicker__empty" />;
            const disabled = Boolean((min && cell.iso < min) || (max && cell.iso > max));
            const selected = cell.iso === value;
            const isToday = cell.iso === hoje;
            return (
              <button
                key={cell.iso}
                type="button"
                className={`dash-dpicker__day${selected ? " is-selected" : ""}${isToday && !selected ? " is-today" : ""}`}
                disabled={disabled}
                onClick={() => apply(cell.iso)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <div className="fin-mpicker__foot">
          <span />
          <button
            type="button"
            className="fin-mpicker__foot-btn fin-mpicker__foot-btn--primary"
            onClick={() => {
              setView(hoje.slice(0, 7));
              apply(hoje);
            }}
          >
            Hoje
          </button>
        </div>
      </div>
    </div>
  );
}
