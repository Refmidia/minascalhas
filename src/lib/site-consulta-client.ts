import type { ConsultaDocumentoResult } from "@/lib/consulta-cnpj.server";

export async function fetchConsultaDocumentoSite(documento: string): Promise<ConsultaDocumentoResult> {
  const qs = new URLSearchParams({ documento: documento.replace(/\D/g, "") });
  const res = await fetch(`/api/consulta-documento?${qs}`);
  return (await res.json()) as ConsultaDocumentoResult;
}

export async function fetchViaCep(cep: string): Promise<{
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
} | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    return (await res.json()) as {
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };
  } catch {
    return null;
  }
}
