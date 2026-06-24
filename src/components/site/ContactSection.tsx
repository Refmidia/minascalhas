import { MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { CONTACT } from "@/data/site";

export function ContactSection() {
  return (
    <section id="contato" className="bg-brand-green py-24 lg:py-32 text-white" aria-labelledby="contato-title">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 id="contato-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold">Fale com a Minas Calhas</h2>
          <p className="mt-4 text-white/85 text-lg">Solicite seu orçamento sem compromisso.</p>

          <ul className="mt-10 space-y-5">
            <Item icon={<MessageCircle size={20} aria-hidden="true" />} label="WhatsApp" value={CONTACT.whatsapp} />
            <Item icon={<Phone size={20} aria-hidden="true" />} label="Telefone" value={CONTACT.phone} />
            <Item icon={<Mail size={20} aria-hidden="true" />} label="E-mail" value={CONTACT.email} />
            <Item icon={<MapPin size={20} aria-hidden="true" />} label="Endereço" value={CONTACT.address} />
          </ul>
        </div>

        <div className="rounded-[22px] overflow-hidden shadow-2xl border border-white/20 bg-white">
          <iframe
            title="Localização da Minas Calhas no mapa"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-50.595%2C-22.760%2C-50.555%2C-22.730&amp;layer=mapnik"
            className="w-full h-[420px] border-0"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="h-11 w-11 rounded-full bg-white/15 grid place-items-center shrink-0">{icon}</span>
      <div>
        <div className="text-xs uppercase tracking-wider text-white/70 font-semibold">{label}</div>
        <div className="text-white font-medium">{value}</div>
      </div>
    </li>
  );
}
