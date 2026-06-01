/** Formata telefone BR como no PHP formatarTelefone(). */
export function formatarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return telefone.trim() || "—";
  const m = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  if (!m) return telefone.trim();
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

export function telefoneWhatsappLink(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "";
  const wa = digits.startsWith("55") ? digits : `55${digits.replace(/^0+/, "")}`;
  return `https://wa.me/${wa}`;
}
