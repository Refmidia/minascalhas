import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/painel/logs")({
  component: LogsPage,
});

function LogsPage() {
  const [itens, setItens] = useState<
    { nivel: string; mensagem: string; criado_em: string; pagina: string | null }[]
  >([]);

  useEffect(() => {
    fetch("/api/admin/logs", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { itens?: typeof itens }) => setItens(d.itens ?? []));
  }, []);

  return (
    <>
      <AdminPageHeader title="Log do sistema" subtitle="admin_logs — leitura" showNovaVisita={false} />
      <div className="space-y-2">
        {itens.map((l, i) => (
          <div key={i} className="rounded-lg bg-[#1a222d] border border-white/10 p-3 text-sm">
            <span
              className={`text-xs font-bold uppercase ${
                l.nivel === "error" ? "text-red-400" : "text-slate-500"
              }`}
            >
              {l.nivel}
            </span>
            <p className="text-white mt-1">{l.mensagem}</p>
            <p className="text-slate-600 text-xs mt-1">
              {new Date(l.criado_em).toLocaleString("pt-BR")} {l.pagina ? `· ${l.pagina}` : ""}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
