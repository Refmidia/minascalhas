import type { CnpjFornecedorDados, ConsultaDocumentoResult } from "@/lib/consulta-cnpj.server";

export type { CnpjFornecedorDados, ConsultaDocumentoResult };

export async function fetchConsultaCnpj(cnpj: string): Promise<{
  status: string;
  dados?: CnpjFornecedorDados;
  mensagem?: string;
}> {
  const qs = new URLSearchParams({ cnpj: cnpj.replace(/\D/g, "") });
  const res = await fetch(`/api/admin/consulta-cnpj?${qs}`, { credentials: "include" });
  return (await res.json()) as {
    status: string;
    dados?: CnpjFornecedorDados;
    mensagem?: string;
  };
}

export async function fetchConsultaDocumento(documento: string): Promise<ConsultaDocumentoResult> {
  const qs = new URLSearchParams({ documento: documento.replace(/\D/g, "") });
  const res = await fetch(`/api/admin/consulta-documento?${qs}`, { credentials: "include" });
  return (await res.json()) as ConsultaDocumentoResult;
}
