const PREFIX_FUNC = "mc-ponto-ass-func-";
const KEY_EMPRESA = "mc-ponto-ass-empresa";
const INK_LIMIAR = 242;
const ASS_PAD = 20;

/** PNG padrão da assinatura — o traço vai sempre no centro. */
export const ASSINATURA_PNG_LARGURA = 800;
export const ASSINATURA_PNG_ALTURA = 240;
/** Caixa no PDF na mesma proporção do PNG, sem object-fit (html2canvas ignora). */
export const ASSINATURA_PDF_LARGURA_PX = 160;
export const ASSINATURA_PDF_ALTURA_PX = Math.round(
  (ASSINATURA_PDF_LARGURA_PX * ASSINATURA_PNG_ALTURA) / ASSINATURA_PNG_LARGURA,
);

function lerStorage(chave: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(chave);
    return v && v.startsWith("data:image/") ? v : null;
  } catch {
    return null;
  }
}

function gravarStorage(chave: string, dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl && dataUrl.startsWith("data:image/")) {
      window.localStorage.setItem(chave, dataUrl);
    } else {
      window.localStorage.removeItem(chave);
    }
  } catch {
    /* quota / private mode */
  }
}

export function chaveAssinaturaFuncionarioPonto(usuarioId: number): string {
  return `${PREFIX_FUNC}${usuarioId}`;
}

export function lerAssinaturaFuncionarioPonto(usuarioId: number): string | null {
  if (!usuarioId) return null;
  return lerStorage(chaveAssinaturaFuncionarioPonto(usuarioId));
}

export function salvarAssinaturaFuncionarioPonto(usuarioId: number, dataUrl: string | null): void {
  if (!usuarioId) return;
  gravarStorage(chaveAssinaturaFuncionarioPonto(usuarioId), dataUrl);
}

export function lerAssinaturaEmpresaPonto(): string | null {
  return lerStorage(KEY_EMPRESA);
}

export function salvarAssinaturaEmpresaPonto(dataUrl: string | null): void {
  gravarStorage(KEY_EMPRESA, dataUrl);
}

export function mapaAssinaturasFuncionarioPonto(usuarioIds: number[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const id of usuarioIds) {
    const src = lerAssinaturaFuncionarioPonto(id);
    if (src) map[id] = src;
  }
  return map;
}

function ehTinta(r: number, g: number, b: number, a: number): boolean {
  if (a < 24) return false;
  return r < INK_LIMIAR || g < INK_LIMIAR || b < INK_LIMIAR;
}

function pngAssinaturaEmBranco(): string {
  const out = document.createElement("canvas");
  out.width = ASSINATURA_PNG_LARGURA;
  out.height = ASSINATURA_PNG_ALTURA;
  const octx = out.getContext("2d");
  if (!octx) return "";
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, ASSINATURA_PNG_LARGURA, ASSINATURA_PNG_ALTURA);
  return out.toDataURL("image/png");
}

/** Recorta o traço e desenha no centro de um PNG padrão — UI e PDF iguais. */
export function centralizarAssinaturaCanvas(source: HTMLCanvasElement): string | null {
  const w = source.width;
  const h = source.height;
  if (w < 2 || h < 2) return null;

  const copy = document.createElement("canvas");
  copy.width = w;
  copy.height = h;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);

  const pix = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!ehTinta(pix[i], pix[i + 1], pix[i + 2], pix[i + 3])) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  minX = Math.max(0, minX - 4);
  minY = Math.max(0, minY - 4);
  maxX = Math.min(w - 1, maxX + 4);
  maxY = Math.min(h - 1, maxY + 4);

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);
  const out = document.createElement("canvas");
  out.width = ASSINATURA_PNG_LARGURA;
  out.height = ASSINATURA_PNG_ALTURA;
  const octx = out.getContext("2d");
  if (!octx) return pngAssinaturaEmBranco();
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, ASSINATURA_PNG_LARGURA, ASSINATURA_PNG_ALTURA);
  const maxW = ASSINATURA_PNG_LARGURA - ASS_PAD * 2;
  const maxH = ASSINATURA_PNG_ALTURA - ASS_PAD * 2;
  const scale = Math.min(maxW / cropW, maxH / cropH);
  const dw = cropW * scale;
  const dh = cropH * scale;
  const dx = (ASSINATURA_PNG_LARGURA - dw) / 2;
  const dy = (ASSINATURA_PNG_ALTURA - dh) / 2;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(copy, minX, minY, cropW, cropH, dx, dy, dw, dh);
  return out.toDataURL("image/png");
}

export function centralizarAssinaturaDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const ctx = c.getContext("2d");
      if (!ctx || c.width < 2) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(centralizarAssinaturaCanvas(c) ?? dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function centralizarMapaAssinaturas(
  mapa: Record<number, string>,
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  await Promise.all(
    Object.entries(mapa).map(async ([k, v]) => {
      out[Number(k)] = await centralizarAssinaturaDataUrl(v);
    }),
  );
  return out;
}
