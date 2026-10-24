/** Regras de acesso por visão — seguro para client e server. */

/** Hub de módulos + João Finanças: só o admin João. */
export function ehJoaoAdmin(row: {
  nivel?: string;
  nivelReal?: string;
  usuario: string;
  nome?: string;
  email?: string;
}): boolean {
  const nivel = (row.nivelReal ?? row.nivel ?? "").trim().toLowerCase();
  if (nivel && nivel !== "admin") return false;

  const login = row.usuario.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const nome = (row.nome ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const email = (row.email ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (login === "joao" || login.startsWith("joao")) return true;
  if (nome.startsWith("joao ") || nome === "joao") return true;
  if (email.startsWith("joao@") || email.includes("joao.")) return true;
  return false;
}
