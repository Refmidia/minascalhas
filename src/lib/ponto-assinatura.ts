const PREFIX_FUNC = "mc-ponto-ass-func-";
const KEY_EMPRESA = "mc-ponto-ass-empresa";

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
