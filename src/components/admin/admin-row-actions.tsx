import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function InvActionBtn({
  icon,
  title,
  variant = "primary",
  onClick,
}: {
  icon: string;
  title: string;
  variant?: "primary" | "secondary" | "whatsapp" | "muted";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`inv-action-btn inv-action-btn--${variant}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <i className={`bi ${icon}`} aria-hidden="true" />
    </button>
  );
}

export type InvMenuItem = {
  label: string;
  icon?: string;
  onClick: () => void;
  className?: string;
};

const MENU_MIN_WIDTH = 168;
const VIEWPORT_PAD = 8;

function computeMenuPosition(toggle: HTMLElement, menuEl: HTMLElement | null) {
  const rect = toggle.getBoundingClientRect();
  const menuWidth = Math.max(menuEl?.offsetWidth ?? 0, MENU_MIN_WIDTH);
  const menuHeight = menuEl?.offsetHeight ?? 0;
  const gap = 6;

  let left = rect.right - menuWidth;
  let top = rect.bottom + gap;

  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  if (left + menuWidth > window.innerWidth - VIEWPORT_PAD) {
    left = window.innerWidth - menuWidth - VIEWPORT_PAD;
  }

  if (menuHeight > 0 && top + menuHeight > window.innerHeight - VIEWPORT_PAD) {
    top = rect.top - menuHeight - gap;
  }
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;

  return { top, left, minWidth: MENU_MIN_WIDTH };
}

export function InvRowActions({
  primary,
  menu,
  ariaLabel = "Mais ações",
}: {
  primary: ReactNode;
  menu: InvMenuItem[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!toggleRef.current) return;
    setMenuPos(computeMenuPosition(toggleRef.current, menuRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, menu.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => updatePosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuPortal =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            className="dropdown-menu inv-dropdown-panel inv-dropdown-panel--portal shadow show"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              zIndex: 1100,
            }}
            role="menu"
          >
            {menu.map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`dropdown-item d-flex align-items-center gap-2${item.className ? ` ${item.className}` : ""}`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.icon ? <i className={`bi ${item.icon}`} aria-hidden="true" /> : null}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="inv-action-group inv-action-group--row-end" role="group">
      <div className="inv-action-group__primary">{primary}</div>
      {menu.length > 0 ? (
        <div className="inv-action-group__menu" ref={wrapRef}>
          <div className={`dropdown inv-row-actions${open ? " show" : ""}`}>
            <button
              ref={toggleRef}
              type="button"
              className="inv-actions-toggle dropdown-toggle"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={ariaLabel}
              onClick={() => setOpen((v) => !v)}
            >
              <i className="bi bi-three-dots-vertical" aria-hidden="true" />
            </button>
          </div>
          {menuPortal}
        </div>
      ) : null}
    </div>
  );
}
