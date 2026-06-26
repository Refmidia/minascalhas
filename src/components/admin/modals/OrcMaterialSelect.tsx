import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = {
  id: number;
  material: string;
};

type Props = {
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  /** Lista completa — usada para exibir o material selecionado quando o filtro o oculta. */
  allOptions?: Option[];
  search?: string;
  onSearchChange?: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function OrcMaterialSelect({
  value,
  onChange,
  options,
  allOptions,
  search = "",
  onSearchChange,
  disabled = false,
  placeholder = "Selecione…",
}: Props) {
  const searchable = Boolean(onSearchChange);
  const catalog = allOptions ?? options;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = catalog.find((o) => String(o.id) === value);
  const anchorRef = searchable ? inputRef : triggerRef;

  const updateMenuPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxHeight = Math.min(320, window.innerHeight - r.bottom - 12);
    const labels = [placeholder, ...options.map((o) => o.material)];
    const longestChars = labels.reduce((max, label) => Math.max(max, label.length), 0);
    const menuWidth = Math.min(
      window.innerWidth - 16,
      520,
      Math.max(r.width, longestChars * 7.4 + 56, 360),
    );
    let left = r.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 4,
      left,
      width: menuWidth,
      maxHeight: Math.max(140, maxHeight),
      zIndex: 1065,
    });
  }, [options, placeholder, searchable]);

  useEffect(() => {
    setHighlight(0);
  }, [search, options.length]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || inputRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onReflow() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updateMenuPosition]);

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  function pick(id: string) {
    onChange(id);
    if (searchable && id) {
      const item = catalog.find((o) => String(o.id) === id);
      if (item) onSearchChange?.(item.material);
    }
    setOpen(false);
  }

  function pickHighlighted() {
    const item = options[highlight];
    if (item) pick(String(item.id));
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, options.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && options.length > 0) {
        pickHighlighted();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="visitas-orc-material-select__menu"
            style={menuStyle}
            role="listbox"
            aria-label="Material"
          >
            {options.length === 0 ? (
              <div className="visitas-orc-material-select__empty" role="status">
                Nenhum material encontrado
              </div>
            ) : (
              options.map((m, idx) => {
                const id = String(m.id);
                const isSelected = value === id;
                const isHighlighted = idx === highlight;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`visitas-orc-material-select__option${isSelected ? " is-selected" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    title={m.material}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => pick(id)}
                  >
                    {m.material}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  if (searchable) {
    return (
      <>
        <div className="visitas-orc-material-select visitas-orc-material-select--search">
          <input
            ref={inputRef}
            type="search"
            className={`form-control visitas-orc-input visitas-orc-material-select__search${open ? " is-open" : ""}`}
            placeholder={placeholder}
            value={search}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            title={selected?.material ?? placeholder}
            onFocus={() => {
              if (!disabled) setOpen(true);
            }}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setOpen(true);
            }}
            onKeyDown={onInputKeyDown}
          />
          <button
            type="button"
            className="visitas-orc-material-select__search-toggle"
            tabIndex={-1}
            disabled={disabled}
            aria-label={open ? "Fechar lista" : "Abrir lista de materiais"}
            onClick={toggle}
          >
            <i className={`bi bi-chevron-${open ? "up" : "down"}`} aria-hidden="true" />
          </button>
        </div>
        {menu}
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`visitas-orc-material-select__trigger visitas-orc-input${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        title={selected?.material ?? placeholder}
        onClick={toggle}
      >
        <span className="visitas-orc-material-select__text">{selected?.material ?? placeholder}</span>
        <i className="bi bi-chevron-down visitas-orc-material-select__chevron" aria-hidden="true" />
      </button>
      {menu}
    </>
  );
}
