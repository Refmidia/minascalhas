import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5518996475269"
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-brand-green hover:bg-brand-green-dark text-white grid place-items-center shadow-xl ring-4 ring-brand-green/20 transition"
    >
      <MessageCircle size={26} />
    </a>
  );
}
