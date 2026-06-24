import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getAuthSecret } from "@/lib/config.server";
import {
  materialVisivelParaFornecedor,
  obterMaterialLiberado,
  type MaterialLiberadoRow,
} from "@/lib/fornecedor-materiais.server";
import { fornecedorEnviarEntrega } from "@/lib/fornecedores.server";

export const FORN_CARRINHO_COOKIE = "forn_carrinho_entrega";
const CARRINHO_MS = 7 * 24 * 60 * 60 * 1000;

export type CarrinhoItemEntrega = {
  temp_id: string;
  material_id: number;
  material_nome: string;
  metros: string;
  valor_unitario: string;
  observacao: string;
};

type CarrinhoPayload = {
  exp: number;
  fornecedor_id: number;
  items: CarrinhoItemEntrega[];
};

function signPayload(payloadB64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function encodeCarrinho(payload: Omit<CarrinhoPayload, "exp">): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;
  const body: CarrinhoPayload = { ...payload, exp: Date.now() + CARRINHO_MS };
  const payloadB64 = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

function parseCarrinhoToken(token: string | null | undefined): CarrinhoPayload | null {
  if (!token) return null;
  const secret = getAuthSecret();
  if (!secret) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = signPayload(payloadB64, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const raw = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as Partial<
      CarrinhoPayload
    >;
    if (typeof raw.exp !== "number" || raw.exp <= Date.now()) return null;
    const fid = Number(raw.fornecedor_id ?? 0);
    if (fid <= 0) return null;
    const items = Array.isArray(raw.items) ? raw.items : [];
    return {
      exp: raw.exp,
      fornecedor_id: fid,
      items: items.filter(
        (it): it is CarrinhoItemEntrega =>
          typeof it === "object" &&
          it != null &&
          typeof it.temp_id === "string" &&
          typeof it.material_id === "number",
      ),
    };
  } catch {
    return null;
  }
}

export function carrinhoCookieHeader(token: string): [string, string] {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(CARRINHO_MS / 1000);
  return [
    "Set-Cookie",
    `${FORN_CARRINHO_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  ];
}

export function clearCarrinhoCookieHeader(): [string, string] {
  return ["Set-Cookie", `${FORN_CARRINHO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`];
}

export function getCarrinhoFromRequest(
  request: Request,
  fornecedorId: number,
): CarrinhoItemEntrega[] {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${FORN_CARRINHO_COOKIE}=([^;]+)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  const parsed = parseCarrinhoToken(token);
  if (!parsed || parsed.fornecedor_id !== fornecedorId) return [];
  return parsed.items;
}

function persistCarrinho(
  fornecedorId: number,
  items: CarrinhoItemEntrega[],
): { token: string } | { error: string } {
  const token = encodeCarrinho({ fornecedor_id: fornecedorId, items });
  if (!token) return { error: "Sessão indisponível. Configure AUTH_SECRET." };
  return { token };
}

export async function adicionarItemCarrinhoEntrega(
  request: Request,
  fornecedorId: number,
  input: {
    material_id: number;
    metros: string;
    valor_unitario: string;
    observacao?: string;
  },
): Promise<{ ok: boolean; message: string; carrinho: CarrinhoItemEntrega[]; setCookie?: string }> {
  const mid = Number(input.material_id) || 0;
  if (mid <= 0) {
    return { ok: false, message: "Selecione um material válido liberado pelo administrador.", carrinho: [] };
  }

  const visivel = await materialVisivelParaFornecedor(mid, fornecedorId);
  if (!visivel) {
    return { ok: false, message: "Selecione um material válido liberado pelo administrador.", carrinho: [] };
  }

  const mat = await obterMaterialLiberado(mid, fornecedorId);
  if (!mat) {
    return { ok: false, message: "Material não encontrado.", carrinho: [] };
  }

  const carrinho = getCarrinhoFromRequest(request, fornecedorId);
  const novo: CarrinhoItemEntrega = {
    temp_id: `item_${randomBytes(8).toString("hex")}`,
    material_id: mat.id,
    material_nome: mat.material,
    metros: String(input.metros ?? "1").trim() || "1",
    valor_unitario: String(input.valor_unitario ?? "0").trim() || "0",
    observacao: String(input.observacao ?? "").trim().slice(0, 255),
  };
  carrinho.push(novo);

  const saved = persistCarrinho(fornecedorId, carrinho);
  if ("error" in saved) {
    return { ok: false, message: saved.error, carrinho: [] };
  }

  return {
    ok: true,
    message: "Item adicionado à nota. Revise e clique em «Confirmar e enviar».",
    carrinho,
    setCookie: saved.token,
  };
}

export async function removerItemCarrinhoEntrega(
  request: Request,
  fornecedorId: number,
  tempId: string,
): Promise<{ ok: boolean; message: string; carrinho: CarrinhoItemEntrega[]; setCookie?: string }> {
  const carrinho = getCarrinhoFromRequest(request, fornecedorId).filter(
    (it) => it.temp_id !== tempId,
  );
  const saved = persistCarrinho(fornecedorId, carrinho);
  if ("error" in saved) {
    return { ok: false, message: saved.error, carrinho: [] };
  }
  return {
    ok: true,
    message: "Item removido da nota.",
    carrinho,
    setCookie: saved.token,
  };
}

export async function enviarCarrinhoEntrega(
  request: Request,
  fornecedorId: number,
  usuarioId: number,
  observacaoGeral: string,
): Promise<{
  ok: boolean;
  message: string;
  entrega_id?: number;
  clearCookie?: boolean;
}> {
  const carrinho = getCarrinhoFromRequest(request, fornecedorId);
  if (carrinho.length === 0) {
    return { ok: false, message: "Adicione pelo menos um produto antes de enviar." };
  }

  const entregaId = await fornecedorEnviarEntrega(
    fornecedorId,
    usuarioId,
    carrinho.map((it) => ({
      material_id: it.material_id,
      metros: it.metros,
      valor_unitario: it.valor_unitario,
      observacao: it.observacao,
    })),
    observacaoGeral,
  );

  if (entregaId <= 0) {
    return {
      ok: false,
      message:
        "Erro ao enviar a entrega. Verifique material e quantidade em metros e tente novamente.",
    };
  }

  return {
    ok: true,
    message: "Entrega enviada! A Minas Calhas vai conferir e dar o visto de recebido.",
    entrega_id: entregaId,
    clearCookie: true,
  };
}
