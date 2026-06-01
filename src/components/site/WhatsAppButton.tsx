import { MessageCircle } from "lucide-react";
import { CONTACT } from "@/data/site";

export function WhatsAppButton() {
  return (
    <a
      href={CONTACT.whatsappLink}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-brand-green hover:bg-brand-green-dark text-white grid place-items-center shadow-xl ring-4 ring-brand-green/20 transition"
    >
      <MessageCircle size={26} aria-hidden="true" />
    </a>
  );
}
