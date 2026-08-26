import { PDF_A4_HEIGHT_PX, PDF_A4_WIDTH_PX } from "@/lib/os-pdf";
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
    imgs.map(async (img) => {
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          /* imagem quebrada */
        }
        return;
      }
      if (img.complete) return;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
  );
}

export function encaixarFolhaA4(el: HTMLElement): () => void {
  const prev = {
    width: el.style.width,
    maxWidth: el.style.maxWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    maxHeight: el.style.maxHeight,
    margin: el.style.margin,
    boxSizing: el.style.boxSizing,
    overflow: el.style.overflow,
    boxShadow: el.style.boxShadow,
    display: el.style.display,
  };
  const gaps = Array.from(el.querySelectorAll<HTMLElement>(".ponto-rel-visto-gap"));
  const prevGaps = gaps.map((g) => g.style.height);

  el.style.display = "block";
  el.style.width = `${PDF_A4_WIDTH_PX}px`;
  el.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
  el.style.margin = "0 auto";
  el.style.boxSizing = "border-box";
  el.style.boxShadow = "none";
  el.style.height = "auto";
  el.style.minHeight = "0";
  el.style.maxHeight = "none";
  el.style.overflow = "visible";
  for (const g of gaps) g.style.height = "0px";
  void el.offsetHeight;

  const contentH = Math.max(el.scrollHeight, el.offsetHeight);
  const sobra = PDF_A4_HEIGHT_PX - contentH;
  if (gaps[0] && sobra > 0) {
    gaps[0].style.height = `${sobra}px`;
  }
  el.style.minHeight = `${PDF_A4_HEIGHT_PX}px`;
  el.style.height = `${PDF_A4_HEIGHT_PX}px`;
  void el.offsetHeight;

  return () => {
    el.style.width = prev.width;
    el.style.maxWidth = prev.maxWidth;
    el.style.height = prev.height;
    el.style.minHeight = prev.minHeight;
    el.style.maxHeight = prev.maxHeight;
    el.style.margin = prev.margin;
    el.style.boxSizing = prev.boxSizing;
    el.style.overflow = prev.overflow;
    el.style.boxShadow = prev.boxShadow;
    el.style.display = prev.display;
    gaps.forEach((g, i) => {
      g.style.height = prevGaps[i] ?? "";
    });
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
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  window.scrollTo(0, 0);
  const restaurar = encaixarFolhaA4(el);

  try {
    await aguardarLayoutExportacao(el);
    el.style.overflow = "hidden";

    const [canvasMod, jspdfMod] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const html2canvas = canvasMod.default;
    const JsPDF = jspdfMod.jsPDF;
    if (!html2canvas || !JsPDF) throw new Error("Biblioteca de PDF indisponível.");

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: PDF_A4_WIDTH_PX,
      height: PDF_A4_HEIGHT_PX,
      windowWidth: PDF_A4_WIDTH_PX,
      windowHeight: PDF_A4_HEIGHT_PX,
      onclone: (doc: Document) => {
        const cloned = doc.getElementById("ponto-relatorio-documento");
        if (!cloned) return;
        cloned.style.margin = "0";
        cloned.style.boxShadow = "none";
        cloned.style.position = "relative";
        cloned.style.left = "0";
        cloned.style.top = "0";
        cloned.style.width = `${PDF_A4_WIDTH_PX}px`;
        cloned.style.height = `${PDF_A4_HEIGHT_PX}px`;
        cloned.style.maxHeight = `${PDF_A4_HEIGHT_PX}px`;
        cloned.style.overflow = "hidden";
        const srcGaps = el.querySelectorAll<HTMLElement>(".ponto-rel-visto-gap");
        cloned.querySelectorAll<HTMLElement>(".ponto-rel-visto-gap").forEach((g, i) => {
          g.style.height = srcGaps[i]?.style.height || "0px";
        });
      },
    });

    const img = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.addImage(img, "JPEG", 0, 0, w, h, undefined, "FAST");
    while (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }

    const blob = pdf.output("blob");
    if (!blob || blob.size < 500) {
      throw new Error("PDF gerado está vazio. Tente novamente.");
    }

    baixarBlob(blob, filename);
  } finally {
    restaurar();
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
      "position:fixed;left:0;top:0;width:1100px;height:1400px;border:0;opacity:0.01;pointer-events:none;z-index:-1;overflow:auto;background:#ececec";

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
    const extra: Record<string, string> = { download: "1", req };
    if (funcionarioNome) extra.nome = funcionarioNome;
    iframe.src = urlPontoRelatorio(params, extra);
    document.body.appendChild(iframe);
  });
}

export function nomePdfPontoRelatorio(de: string, ate: string, funcionarioNome?: string): string {
  return nomeArquivoPontoRelatorio(de, ate, funcionarioNome);
}
