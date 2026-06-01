import { Droplets } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-brand-navy text-white/85">
      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-brand-green grid place-items-center text-white">
              <Droplets size={18} />
            </span>
            <span className="font-display font-bold text-white text-lg">
              Alex <span className="text-brand-green">Calhas</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-white/70 max-w-xs leading-relaxed">
            Soluções em calhas, rufos e acabamentos com qualidade e confiança.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Navegação</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#inicio" className="hover:text-brand-green">Início</a></li>
            <li><a href="#servicos" className="hover:text-brand-green">Serviços</a></li>
            <li><a href="#galeria" className="hover:text-brand-green">Projetos</a></li>
            <li><a href="#galeria" className="hover:text-brand-green">Galeria</a></li>
            <li><a href="#contato" className="hover:text-brand-green">Contato</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Contato</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li>(18) 99647-5269</li>
            <li>(18) 99608-9273</li>
            <li>contato@alexcalhas.com</li>
            <li>Rua Angelim, 137, Parque Industrial, Tarumã/SP</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-white/60 text-center">
          © 2026 Alex Calhas. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
