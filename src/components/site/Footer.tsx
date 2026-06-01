import { Droplets } from "lucide-react";
import { COMPANY, CONTACT, NAV_LINKS } from "@/data/site";

export function Footer() {
  return (
    <footer className="bg-brand-navy text-white/85">
      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-brand-green grid place-items-center text-white" aria-hidden="true">
              <Droplets size={18} />
            </span>
            <span className="font-display font-bold text-white text-lg">
              Alex <span className="text-brand-green">Calhas</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-white/70 max-w-xs leading-relaxed">{COMPANY.tagline}</p>
        </div>

        <nav aria-label="Rodapé — navegação">
          <h4 className="text-white font-semibold mb-4">Navegação</h4>
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-brand-green">{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h4 className="text-white font-semibold mb-4">Contato</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li>{CONTACT.whatsapp}</li>
            <li>{CONTACT.phone}</li>
            <li>{CONTACT.email}</li>
            <li>{CONTACT.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-white/60 text-center">
          © {COMPANY.year} {COMPANY.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
