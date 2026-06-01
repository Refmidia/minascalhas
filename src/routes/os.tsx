import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { OrcamentoDocument } from "@/components/os/OrcamentoDocument";
import type { AgendamentoItem } from "@/lib/admin-api";
import type { OrcamentoLinha } from "@/lib/orcamento.server";

export const Route = createFileRoute("/os")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: Number(s.id) || 0,
    embed: s.embed === "1" || s.embed === 1,
    print: s.print === "1" || s.print === 1,
  }),
  component: OsPage,
  head: () => ({
    meta: [{ title: "Orçamento — Alex Calhas" }],
    links: [{ rel: "stylesheet", href: "/css/os-orcamento.css" }],
  }),
});

function OsPage() {
  const { id, embed, print } = Route.useSearch();
  const [item, setItem] = useState<AgendamentoItem | null>(null);
  const [itens, setItens] = useState<OrcamentoLinha[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("ID do orçamento não informado.");
      return;
    }
    fetch(`/api/os?id=${id}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; item?: AgendamentoItem; itens?: OrcamentoLinha[]; message?: string }) => {
        if (!d.ok || !d.item) throw new Error(d.message ?? "Erro");
        setItem(d.item);
        setItens(d.itens ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Orçamento não encontrado."));
  }, [id]);

  useEffect(() => {
    if (!print || !item) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [print, item]);

  if (error) {
    return (
      <main className="os-orc-body">
        <p style={{ textAlign: "center", padding: 32, color: "#b91c1c" }}>{error}</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="os-orc-body">
        <p style={{ textAlign: "center", padding: 32, color: "#64748b" }}>Carregando orçamento…</p>
      </main>
    );
  }

  return (
    <main className={embed ? "os-orc-body os-orc-body--embed" : "os-orc-body"}>
      <OrcamentoDocument item={item} itens={itens} />
      {!embed ? (
        <div className="os-orc-print-actions">
          <button type="button" className="os-orc-print-btn" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      ) : null}
    </main>
  );
}
