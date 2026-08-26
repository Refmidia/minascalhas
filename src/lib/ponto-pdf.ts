import { PDF_A4_WIDTH_PX } from "@/lib/os-pdf";
import { nomeArquivoPontoRelatorio } from "@/lib/ponto-relatorio";

export const PONTO_PDF_MSG_DONE = "ponto-pdf-done";
export const PONTO_PDF_MSG_ERROR = "ponto-pdf-error";

export type PontoPdfParams = {
  de: string;
  ate: string;
  usuario?: number;
  assFunc?: boolean;
  assEmpresa?: boolean;
};

function baixarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

async function aguardarImagens(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

function prepararElementoPdf(el: HTMLElement): () => void {
  const prev = {
    width: el.style.width,
    maxWidth: el.style.maxWidth,
    margin: el.style.margin,
    boxSizing: el.style.boxSizing,
    overflow: el.style.overflow,
    boxShadow: el.style.boxShadow,
  };
  el.style.width = `${PDF_A4_WIDTH_PX}px`;
  el.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
  el.style.margin = "0";
  el.style.boxSizing = "border-box";
  el.style.overflow = "visible";
  el.style.boxShadow = "none";
  return () => {
    el.style.width = prev.width;
    el.style.maxWidth = prev.maxWidth;
    el.style.margin = prev.margin;
    el.style.boxSizing = prev.boxSizing;
    el.style.overflow = prev.overflow;
    el.style.boxShadow = prev.boxShadow;
  };
}

async function aguardarLayoutExportacao(el: HTMLElement): Promise<void> {
  void el.offsetHeight;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function gerarPdfPontoRelatorio(el: HTMLElement, filename: string): Promise<void> {
  await aguardarImagens(el);
  document.documentElement.classList.add("ponto-rel-exporting");
  const restaurar = prepararElementoPdf(el);

  try {
    await aguardarLayoutExportacao(el);
    const { width, height } = {
      width: PDF_A4_WIDTH_PX,
      height: Math.max(el.scrollHeight, el.offsetHeight, 1),
    };
    const mod = await import("html2pdf.js");
    const html2pdf = mod.default;
    if (!html2pdf) throw new Error("Biblioteca de PDF indisponível.");

    const blob = (await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          onclone: (doc: Document) => {
            doc.documentElement.classList.add("ponto-rel-exporting");
            const cloned = doc.getElementById("ponto-relatorio-documento");
            if (!cloned) return;
            cloned.style.width = `${PDF_A4_WIDTH_PX}px`;
            cloned.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
            cloned.style.margin = "0";
            cloned.style.boxSizing = "border-box";
            cloned.style.overflow = "visible";
            cloned.style.boxShadow = "none";
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".ponto-rel-func__head", ".ponto-rel-resumo", ".ponto-rel-visto", "tr"],
        },
      })
      .from(el)
      .toPdf()
      .output("blob")) as Blob;

    if (!blob || blob.size < 500) {
      throw new Error("PDF gerado está vazio. Tente novamente.");
    }

    baixarBlob(blob, filename);
  } finally {
    restaurar();
    document.documentElement.classList.remove("ponto-rel-exporting");
  }
}

export function urlPontoRelatorio(params: PontoPdfParams, extra?: Record<string, string>): string {
  const qs = new URLSearchParams();
  qs.set("de", params.de);
  qs.set("ate", params.ate);
  if (params.usuario && params.usuario > 0) qs.set("usuario", String(params.usuario));
  if (params.assFunc === false) qs.set("assFunc", "0");
  if (params.assFunc) qs.set("assFunc", "1");
  if (params.assEmpresa) qs.set("assEmpresa", "1");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) qs.set(k, v);
    }
  }
  return `/ponto-relatorio?${qs}`;
}

/**
 * Gera o PDF num iframe da rota /ponto-relatorio (sem CSS do painel admin).
 */
export function baixarPdfPontoRelatorio(params: PontoPdfParams, funcionarioNome?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Indisponível neste ambiente."));
      return;
    }

    const req = `p${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.title = "Gerando PDF de ponto";
    iframe.style.cssText =
      "position:fixed;left:-12000px;top:0;width:834px;height:12000px;border:0;opacity:0;pointer-events:none;overflow:visible";

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao gerar o PDF."));
    }, 90000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; req?: string; message?: string };
      if (data?.req !== req) return;
      if (data.type === PONTO_PDF_MSG_DONE) {
        cleanup();
        resolve();
      }
      if (data.type === PONTO_PDF_MSG_ERROR) {
        cleanup();
        reject(new Error(data.message ?? "Erro ao gerar PDF."));
      }
    }

    window.addEventListener("message", onMessage);
    const extra: Record<string, string> = { embed: "1", download: "1", req };
    if (funcionarioNome) extra.nome = funcionarioNome;
    iframe.src = urlPontoRelatorio(params, extra);
    document.body.appendChild(iframe);
  });
}

export function nomePdfPontoRelatorio(de: string, ate: string, funcionarioNome?: string): string {
  return nomeArquivoPontoRelatorio(de, ate, funcionarioNome);
}
