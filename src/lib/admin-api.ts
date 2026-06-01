import type { InventarioStatus } from "@/lib/agendamento-constants";
import type { OrcamentoLinha } from "@/lib/orcamento.server";
import type { AdminVisao } from "@/lib/visao.server";

export type AgendamentoItem = {
  id: number;
  status: string;
  nome: string;
  cpfCnpj: string | null;
  telefone: string;
  endereco: string;
  bairro: string;
  cep: string;
  numero: string;
  dataVisita: string;
  horaVisita: string;
  observacao: string | null;
  funcionario: number | null;
  valor: number;
  descontoPercent: number;
  formaPagamento: string | null;
  dataMontagem: string | null;
  orcamentoItens?: OrcamentoLinha[];
  materiaisCount?: number;
};

export type MaterialItem = {
  id: number;
  material: string;
  valor_custo: number;
  valor: number;
  fornecedor_id: number | null;
  visivel_fornecedor?: boolean;
  valor_fornecedor?: number;
  fornecedor_ids?: number[];
  qtd_fornecedores?: number;
  fornecedores_nomes?: string[];
};

export type ClienteInventarioDados = {
  id: number;
  nome: string;
  telefone: string;
  cpfCnpj: string;
  endereco: string;
  bairro: string;
  numero: string;
  cep: string;
  dataVisita: string;
  horaVisita: string;
  dataMontagem: string;
  status: string;
};

export type OrcamentoSavePayload = {
  partData: OrcamentoLinha[];
  formaPagamento: string;
  descontoModo?: string;
  descontoPercent?: number | string;
  descontoValor?: number | string;
  valor?: number | string;
  cpfCnpj?: string;
  observacao?: string;
};

export type AdminUser = {
  id: number;
  nome: string;
  usuario: string;
  thumb: string;
  visao: AdminVisao;
  podeSimular: boolean;
  simulando: boolean;
  fornecedorPreviewId: number;
  adminReal: boolean;
  podeGerenciarUsuarios: boolean;
  impersonando: boolean;
  impersonadorNome: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchAdminSession(): Promise<{
  authenticated: boolean;
  user: AdminUser | null;
}> {
  const res = await fetch("/api/admin/session", { credentials: "include" });
  if (!res.ok) return { authenticated: false, user: null };
  const data = await parseJson<{ authenticated?: boolean; user?: AdminUser | null }>(res);
  return {
    authenticated: Boolean(data.authenticated),
    user: data.user ?? null,
  };
}

export async function adminLogin(usuario: string, password: string): Promise<AdminUser> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });
  const data = await parseJson<{ ok?: boolean; user?: AdminUser; message?: string }>(res);
  if (!res.ok || !data.user) throw new Error(data.message ?? "Falha no login.");
  return data.user;
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
}

export async function trocarVisao(visao: AdminVisao): Promise<{ user: AdminUser; redirect: string }> {
  const res = await fetch("/api/admin/visao", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visao }),
  });
  const data = await parseJson<{
    ok?: boolean;
    user?: AdminUser;
    redirect?: string;
    message?: string;
  }>(res);
  if (!res.ok || !data.user) throw new Error(data.message ?? "Não foi possível trocar a visão.");
  return { user: data.user, redirect: data.redirect ?? "/painel" };
}

export async function fetchAgendamentos(status?: string): Promise<AgendamentoItem[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/agendamentos${qs}`, { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; items?: AgendamentoItem[]; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar agendamentos.");
  return data.items ?? [];
}

export async function updateAgendamentoStatus(
  id: number,
  status: InventarioStatus,
): Promise<AgendamentoItem> {
  const res = await fetch(`/api/agendamentos/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ ok?: boolean; item?: AgendamentoItem; message?: string }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Não foi possível atualizar.");
  return data.item;
}

export async function deleteAgendamento(id: number): Promise<void> {
  const res = await fetch(`/api/agendamentos/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível cancelar.");
}

export async function fetchMateriais(): Promise<MaterialItem[]> {
  const res = await fetch("/api/admin/materiais", { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; itens?: MaterialItem[]; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar materiais.");
  return data.itens ?? [];
}

export async function criarMaterial(payload: {
  material: string;
  valor_custo: string;
  valor: string;
}): Promise<void> {
  const res = await fetch("/api/admin/materiais", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao cadastrar material.");
}

export async function atualizarMaterial(payload: {
  id: number;
  material: string;
  valor_custo: string;
  valor: string;
  valor_fornecedor?: string;
  fornecedor_ids?: number[];
}): Promise<void> {
  const res = await fetch("/api/admin/materiais", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao salvar material.");
}

export async function excluirMaterial(id: number): Promise<void> {
  const res = await fetch(`/api/admin/materiais?id=${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao excluir material.");
}

export type FornecedorSelect = {
  id: number;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
};

export async function fetchFornecedoresSelect(): Promise<FornecedorSelect[]> {
  const res = await fetch("/api/admin/fornecedores", { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; fornecedores?: FornecedorSelect[]; message?: string }>(
    res,
  );
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar fornecedores.");
  return data.fornecedores ?? [];
}

export async function fetchClienteInventario(id: number): Promise<ClienteInventarioDados> {
  const res = await fetch(`/api/agendamentos/${id}/cliente`, { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; dados?: ClienteInventarioDados; message?: string }>(
    res,
  );
  if (!res.ok || !data.dados) throw new Error(data.message ?? "Erro ao carregar cliente.");
  return data.dados;
}

export async function saveClienteInventario(
  id: number,
  payload: Omit<ClienteInventarioDados, "id" | "status">,
): Promise<AgendamentoItem> {
  const res = await fetch(`/api/agendamentos/${id}/cliente`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: payload.nome,
      telefone: payload.telefone,
      cpfCnpj: payload.cpfCnpj,
      endereco: payload.endereco,
      bairro: payload.bairro,
      numero: payload.numero,
      cep: payload.cep,
      data: payload.dataVisita,
      hora: payload.horaVisita,
      dataMontagem: payload.dataMontagem,
    }),
  });
  const data = await parseJson<{ ok?: boolean; item?: AgendamentoItem; message?: string }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Erro ao salvar.");
  return data.item;
}

export async function fetchOrcamentoInventario(id: number): Promise<{
  partData: OrcamentoLinha[];
  valor: number;
  descontoPercent: number;
  observacao: string;
  cpfCnpj: string;
}> {
  const res = await fetch(`/api/agendamentos/${id}/orcamento`, { credentials: "include" });
  const data = await parseJson<{
    ok?: boolean;
    dados?: {
      partData: OrcamentoLinha[];
      valor: number;
      descontoPercent: number;
      observacao: string;
      cpfCnpj: string;
    };
    message?: string;
  }>(res);
  if (!res.ok || !data.dados) throw new Error(data.message ?? "Erro ao carregar orçamento.");
  return data.dados;
}

export async function salvarOrcamentoNovo(
  id: number,
  payload: OrcamentoSavePayload,
): Promise<{ item: AgendamentoItem; valor: number; nome: string; telefone: string }> {
  const res = await fetch(`/api/agendamentos/${id}/orcamento`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{
    ok?: boolean;
    item?: AgendamentoItem;
    valor?: number;
    nome?: string;
    telefone?: string;
    message?: string;
  }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Erro ao salvar orçamento.");
  return {
    item: data.item,
    valor: data.valor ?? Number(data.item.valor),
    nome: data.nome ?? data.item.nome,
    telefone: data.telefone ?? data.item.telefone,
  };
}

export async function salvarOrcamentoEdicao(
  id: number,
  payload: OrcamentoSavePayload,
): Promise<{ item: AgendamentoItem; valor: number }> {
  const res = await fetch(`/api/agendamentos/${id}/orcamento`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{
    ok?: boolean;
    item?: AgendamentoItem;
    valor?: number;
    message?: string;
  }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Erro ao atualizar orçamento.");
  return { item: data.item, valor: data.valor ?? Number(data.item.valor) };
}

export async function confirmarMontagem(
  id: number,
  dataMontagem: string,
): Promise<AgendamentoItem> {
  const res = await fetch(`/api/agendamentos/${id}/confirmar-montagem`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataMontagem }),
  });
  const data = await parseJson<{ ok?: boolean; item?: AgendamentoItem; message?: string }>(res);
  if (!res.ok || !data.item) throw new Error(data.message ?? "Erro ao confirmar.");
  return data.item;
}

export async function finalizarServico(id: number): Promise<AgendamentoItem> {
  return updateAgendamentoStatus(id, "finalizado");
}

export async function criarVisitaPainel(
  payload: import("@/lib/validation").AgendamentoInput,
): Promise<{ id: number }> {
  const res = await fetch("/api/agendamentos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ ok?: boolean; id?: number; message?: string }>(res);
  if (!res.ok || !data.id) throw new Error(data.message ?? "Erro ao agendar.");
  return { id: data.id };
}

export type UsuarioItem = {
  id: number;
  thumb: string;
  nome: string;
  usuario: string;
  email: string;
  nivel: string;
  fornecedor_id: number | null;
  fornecedor_nome?: string | null;
};

export async function fetchUsuarios(): Promise<UsuarioItem[]> {
  const res = await fetch("/api/admin/usuarios", { credentials: "include" });
  const data = await parseJson<{ ok?: boolean; itens?: UsuarioItem[]; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar usuários.");
  return data.itens ?? [];
}

export async function criarUsuario(payload: {
  nome: string;
  usuario: string;
  email: string;
  senha: string;
  nivel: string;
}): Promise<void> {
  const res = await fetch("/api/admin/usuarios", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao cadastrar usuário.");
}
