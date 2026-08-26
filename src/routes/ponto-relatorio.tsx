import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { z } from "zod";

import { PontoRelatorioDocument } from "@/components/os/PontoRelatorioDocument";
import { centralizarAssinaturaDataUrl, centralizarMapaAssinaturas } from "@/lib/ponto-assinatura";
import {
  encaixarFolhaA4,
  gerarPdfPontoRelatorio,
  nomePdfPontoRelatorio,
  PONTO_PDF_MSG_DONE,
  PONTO_PDF_MSG_ERROR,
} from "@/lib/ponto-pdf";
import type { PontoRelatorioJornada } from "@/lib/ponto-relatorio";
import { pontoHojeIso } from "@/lib/ponto-timezone";
import { buildPageHead } from "@/lib/seo";

const searchSchema = z.object({
  de: z.string().optional(),
  ate: z.string().optional(),
  usuario: z.coerce.number().optional().catch(undefined),
  embed: z.union([z.literal("1"), z.literal(1)]).optional(),
  download: z.union([z.literal("1"), z.literal(1)]).optional(),
  req: z.string().optional(),
  nome: z.string().optional(),
  assFunc: z.union([z.literal("1"), z.literal(1), z.literal("0"), z.literal(0)]).optional(),
  assEmpresa: z.union([z.literal("1"), z.literal(1), z.literal("0"), z.literal(0)]).optional(),
});

export const Route = createFileRoute("/ponto-relatorio")({
  validateSearch: searchSchema,
  component: PontoRelatorioPage,
  head: () => {
    const seo = buildPageHead({
      title: "Folha de ponto — Minas Calhas",
      description: "Relatório mensal de ponto dos funcionários Minas Calhas.",
      path: "/ponto-relatorio",
      noindex: true,
    });
    return {
      ...seo,
      links: [
        ...seo.links,
        { rel: "stylesheet", href: "/css/ponto-relatorio.css" },
        {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
        },
      ],
    };
  },
});

function PontoRelatorioPage() {
  const search = Route.useSearch();
  const hoje = pontoHojeIso();
  const de = search.de && /^\d{4}-\d{2}-\d{2}$/.test(search.de) ? search.de : `${hoje.slice(0, 8)}01`;
  const ate = search.ate && /^\d{4}-\d{2}-\d{2}$/.test(search.ate) ? search.ate : hoje;
  const usuario = search.usuario && search.usuario > 0 ? search.usuario : 0;
  const embed = search.embed === "1" || search.embed === 1;
  const download = search.download === "1" || search.download === 1;
  const req = search.req ?? "";
  const nome = search.nome ?? "";
  const assFuncOff = search.assFunc === "0" || search.assFunc === 0;
  const assEmpresaOff = search.assEmpresa === "0" || search.assEmpresa === 0;

  const [jornadas, setJornadas] = useState<PontoRelatorioJornada[] | null>(null);
  const [error, setError] = useState("");
  const [baixando, setBaixando] = useState(false);
  const [assinaturaEmpresa, setAssinaturaEmpresa] = useState<string | null>(null);
  const [assinaturasFuncionario, setAssinaturasFuncionario] = useState<Record<number, string>>({});
  const [assReady, setAssReady] = useState(false);

  useEffect(() => {
    if (!embed) return;
    document.documentElement.classList.add("ponto-rel-embed");
    return () => document.documentElement.classList.remove("ponto-rel-embed");
  }, [embed]);

  useEffect(() => {
    let cancelled = false;
    setJornadas(null);
    setAssReady(false);
    const qs = new URLSearchParams();
    qs.set("de", de);
    qs.set("ate", ate);
    qs.set("limite", "5000");
    qs.set("assinaturas", "1");
    if (usuario > 0) qs.set("usuario", String(usuario));
    fetch(`/api/admin/ponto-controle?${qs}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json()) as {
          ok?: boolean;
          message?: string;
          jornadas?: PontoRelatorioJornada[];
          assinaturas?: Record<string, string>;
          assinaturaEmpresa?: string | null;
        };
        if (!r.ok || !d.ok) {
          throw new Error(d.message ?? (r.status === 403 || r.status === 401 ? "Faça login como administrador." : "Erro ao carregar."));
        }
        const fromApi: Record<number, string> = {};
        for (const [k, v] of Object.entries(d.assinaturas ?? {})) {
          const id = Number(k);
          if (id > 0 && v) fromApi[id] = v;
        }
        const [funcs, empresa] = await Promise.all([
          centralizarMapaAssinaturas(fromApi),
          d.assinaturaEmpresa ? centralizarAssinaturaDataUrl(d.assinaturaEmpresa) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setAssinaturasFuncionario(assFuncOff ? {} : funcs);
        setAssinaturaEmpresa(assEmpresaOff ? null : empresa);
        setJornadas(d.jornadas ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Não foi possível carregar o relatório.");
      });
    return () => {
      cancelled = true;
    };
  }, [de, ate, usuario, assFuncOff, assEmpresaOff]);

  useLayoutEffect(() => {
    setAssReady(Boolean(jornadas));
  }, [jornadas]);

  useLayoutEffect(() => {
    if (!jornadas) return;
    const el = document.getElementById("ponto-relatorio-documento");
    if (!el) return;
    return encaixarFolhaA4(el);
  }, [jornadas, assinaturaEmpresa, assinaturasFuncionario]);

  useEffect(() => {
    if (!download || !jornadas || !assReady) return;
    let cancelled = false;

    void (async () => {
      try {
        await new Promise((r) => window.setTimeout(r, 800));
        if (cancelled) return;
        const el = document.getElementById("ponto-relatorio-documento");
        if (!el) throw new Error("Documento não encontrado.");
        await gerarPdfPontoRelatorio(el, nomePdfPontoRelatorio(de, ate, nome));
        if (cancelled) return;
        if (window.parent !== window) {
          window.parent.postMessage({ type: PONTO_PDF_MSG_DONE, req }, window.location.origin);
        }
      } catch (err) {
        if (cancelled) return;
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: PONTO_PDF_MSG_ERROR,
              req,
              message: err instanceof Error ? err.message : "Erro ao gerar PDF.",
            },
            window.location.origin,
          );
        } else {
          setError(err instanceof Error ? err.message : "Erro ao gerar PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [download, jornadas, assReady, de, ate, nome, req]);

  async function handleBaixarPdf() {
    if (!jornadas || baixando) return;
    setBaixando(true);
    try {
      const el = document.getElementById("ponto-relatorio-documento");
      if (!el) throw new Error("Documento não encontrado.");
      await gerarPdfPontoRelatorio(el, nomePdfPontoRelatorio(de, ate, nome));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PDF.");
    } finally {
      setBaixando(false);
    }
  }

  if (error) {
    return (
      <main className="ponto-rel-body">
        <p className="ponto-rel-msg ponto-rel-msg--erro">{error}</p>
      </main>
    );
  }

  if (!jornadas) {
    return (
      <main className="ponto-rel-body">
        <p className="ponto-rel-msg ponto-rel-msg--info">Carregando folha de ponto…</p>
      </main>
    );
  }

  return (
    <main className={embed ? "ponto-rel-body ponto-rel-body--embed" : "ponto-rel-body"}>
      <PontoRelatorioDocument
        de={de}
        ate={ate}
        jornadas={jornadas}
        assinaturaEmpresa={assinaturaEmpresa}
        assinaturasFuncionario={assinaturasFuncionario}
      />
      {!embed ? (
        <div className="ponto-rel-actions no-print">
          <button
            type="button"
            className="ponto-rel-btn ponto-rel-btn--pdf"
            onClick={() => void handleBaixarPdf()}
            disabled={baixando}
          >
            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />{" "}
            {baixando ? "Gerando PDF…" : "Baixar PDF"}
          </button>
          <button
            type="button"
            className="ponto-rel-btn"
            onClick={() => window.print()}
            disabled={baixando}
          >
            <i className="bi bi-printer" aria-hidden="true" /> Imprimir
          </button>
        </div>
      ) : null}
    </main>
  );
}
