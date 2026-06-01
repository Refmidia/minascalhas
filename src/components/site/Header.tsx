import { useState } from "react";
import { Menu, X, Droplets } from "lucide-react";
import { NAV_LINKS, COMPANY } from "@/data/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-brand-border h-[72px]">
      <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
        <a href="#inicio" className="flex items-center gap-2" aria-label={`${COMPANY.name} — início`}>
          <span className="h-9 w-9 rounded-xl bg-brand-green grid place-items-center text-white" aria-hidden="true">
            <Droplets size={18} />
          </span>
          <span className="font-display font-bold text-brand-navy text-lg tracking-tight">
            Alex <span className="text-brand-green">Calhas</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Navegação principal">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-brand-text hover:text-brand-green transition">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <a href="/painel" className="text-sm font-medium text-brand-muted hover:text-brand-navy">Painel</a>
          <a href="#agendar" className="inline-flex items-center rounded-full bg-brand-green hover:bg-brand-green-dark text-white text-sm font-semibold px-5 py-2.5 transition shadow-sm">
            Agendar visita
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 text-brand-navy"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="lg:hidden border-t border-brand-border bg-white">
          <nav className="px-6 py-4 flex flex-col gap-3" aria-label="Navegação móvel">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-2 text-brand-text font-medium">
                {l.label}
              </a>
            ))}
            <a href="/painel" className="py-2 text-brand-muted">Painel</a>
            <a href="#agendar" onClick={() => setOpen(false)} className="mt-2 inline-flex justify-center rounded-full bg-brand-green text-white font-semibold px-5 py-3">
              Agendar visita
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
