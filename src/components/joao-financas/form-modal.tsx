import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormModal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="jf-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="jf-sheet__backdrop" aria-label="Fechar" onClick={onClose} />
      <div
        className={cn("jf-sheet__panel", wide && "jf-sheet__panel--wide")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jf-sheet__head">
          <h2 className="jf-sheet__title">{title.replace(/^\+\s*/, "")}</h2>
          <button type="button" className="jf-sheet__close" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="jf-sheet__body space-y-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="jf-field-label">{children}</label>;
}

export function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("field", props.className)} />;
}

export function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("field", props.className)} />;
}

export function DarkSelect({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 220 && rect.top > spaceBelow;
      setCoords({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const list = document.getElementById(listId);
      if (list?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, listId]);

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            className="jf-select-menu"
            style={{
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
            }}
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className="jf-select-option"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative w-full">
      {label && <FieldLabel>{label}</FieldLabel>}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="field flex items-center justify-between gap-2 text-left cursor-pointer text-foreground"
      >
        <span className="truncate text-foreground">{selected?.label || "Selecionar"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}
