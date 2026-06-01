export type ProdutoItem = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  total_fotos: number;
  imagem_url: string;
};

export type ProdutoInput = {
  nome: string;
  descricao?: string;
  ativo?: boolean;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchProdutos(): Promise<ProdutoItem[]> {
  const res = await fetch("/api/admin/produtos", { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; itens?: ProdutoItem[]; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar produtos.");
  return data.itens ?? [];
}

export async function criarProduto(dados: ProdutoInput): Promise<{ id: number }> {
  const res = await fetch("/api/admin/produtos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dados, ativo: dados.ativo ?? true }),
  });
  const data = await parseJson<{ ok?: boolean; item?: { id: number }; message?: string }>(res);
  if (!res.ok || !data.item?.id) throw new Error(data.message ?? "Não foi possível cadastrar.");
  return { id: data.item.id };
}

export async function salvarProduto(id: number, dados: ProdutoInput): Promise<void> {
  const res = await fetch(`/api/admin/produtos/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível salvar.");
}

export async function excluirProduto(id: number): Promise<void> {
  const res = await fetch(`/api/admin/produtos/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível excluir.");
}

export type ProdutoDetalhe = ProdutoItem;

export type ProdutoFoto = {
  id: number;
  produto_id: number;
  arquivo: string;
  legenda: string | null;
  eh_capa: boolean;
  ordem: number;
  url: string;
};

export async function fetchProdutoDetalhe(id: number): Promise<ProdutoDetalhe> {
  const res = await fetch(`/api/admin/produtos/${id}`, { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; item?: ProdutoDetalhe; message?: string }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Produto não encontrado.");
  return data.item;
}

export async function fetchFotosProduto(produtoId: number): Promise<ProdutoFoto[]> {
  const res = await fetch(`/api/admin/produtos/${produtoId}/fotos`, { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; itens?: ProdutoFoto[]; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar fotos.");
  return data.itens ?? [];
}

export async function uploadFotosProduto(
  produtoId: number,
  files: File[],
  legenda?: string,
): Promise<void> {
  const fd = new FormData();
  for (const f of files) fd.append("fotos", f);
  if (legenda?.trim()) fd.append("legenda", legenda.trim());
  const res = await fetch(`/api/admin/produtos/${produtoId}/fotos`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao enviar fotos.");
}

export async function definirCapaFoto(produtoId: number, fotoId: number): Promise<void> {
  const res = await fetch(`/api/admin/produtos/${produtoId}/fotos/${fotoId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capa: true }),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível definir capa.");
}

export async function salvarLegendaFoto(
  produtoId: number,
  fotoId: number,
  legenda: string,
): Promise<void> {
  const res = await fetch(`/api/admin/produtos/${produtoId}/fotos/${fotoId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legenda }),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível salvar legenda.");
}

export async function excluirFotoProduto(produtoId: number, fotoId: number): Promise<void> {
  const res = await fetch(`/api/admin/produtos/${produtoId}/fotos/${fotoId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível excluir foto.");
}
