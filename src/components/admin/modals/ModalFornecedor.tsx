import { useCallback, useEffect, useRef, useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { fetchConsultaCnpj } from "@/lib/consulta-client";
import type { FornecedorInput, FornecedorRow } from "@/lib/fornecedores-client";

function formatCnpjExib(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj.trim() || "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function apenasDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

function formatCnpjInput(digits: string): string {
  const d = apenasDigitos(digits).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCepInput(digits: string): string {
  const d = apenasDigitos(digits).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function rowToInput(f: FornecedorRow): FornecedorInput {
  return {
    razao_social: f.razao_social,
    nome_fantasia: f.nome_fantasia ?? "",
    cnpj: f.cnpj,
    email: f.email ?? "",
    telefone: f.telefone ?? "",
    contato_nome: f.contato_nome ?? "",
    cep: f.cep ?? "",
    endereco: f.endereco ?? "",
    numero: f.numero ?? "",
    complemento: f.complemento ?? "",
    bairro: f.bairro ?? "",
    cidade: f.cidade ?? "",
    uf: f.uf ?? "",
    observacao: f.observacao ?? "",
  };
}

const empty: FornecedorInput = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  contato_nome: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  observacao: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  fornecedor: FornecedorRow | null;
  onSave: (dados: FornecedorInput, id?: number) => Promise<void>;
};

export function ModalFornecedor({ open, onClose, fornecedor, onSave }: Props) {
  const [form, setForm] = useState<FornecedorInput>(empty);
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const consultasEmAndamento = useRef(new Set<string>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefix = fornecedor ? "edit" : "cad";

  useEffect(() => {
    if (open) setForm(fornecedor ? rowToInput(fornecedor) : empty);
  }, [open, fornecedor]);

  function setField<K extends keyof FornecedorInput>(key: K, value: FornecedorInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const aplicarDadosCnpj = useCallback((dados: Awaited<ReturnType<typeof fetchConsultaCnpj>>["dados"]) => {
    if (!dados) return;
    setForm((prev) => ({
      ...prev,
      razao_social: dados.razao_social || prev.razao_social,
      nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
      cep: dados.cep ? formatCepInput(dados.cep) : prev.cep,
      endereco: dados.endereco || prev.endereco,
      numero: dados.numero || prev.numero,
      complemento: dados.complemento || prev.complemento,
      bairro: dados.bairro || prev.bairro,
      cidade: dados.cidade || prev.cidade,
      uf: dados.uf || prev.uf,
      telefone: dados.telefone || prev.telefone,
      email: dados.email || prev.email,
    }));
  }, []);

  const buscarCnpj = useCallback(
    async (silencioso = false) => {
      const cnpj = apenasDigitos(form.cnpj);
      if (cnpj.length !== 14) {
        if (!silencioso) window.alert("Informe um CNPJ completo (14 dígitos).");
        return;
      }
      const chave = `${prefix}-${cnpj}`;
      if (consultasEmAndamento.current.has(chave)) return;
      consultasEmAndamento.current.add(chave);
      setCnpjLoading(true);
      try {
        const json = await fetchConsultaCnpj(cnpj);
        if (json.status !== "sucesso" || !json.dados) {
          if (!silencioso) {
            window.alert(json.mensagem || "Não foi possível consultar o CNPJ.");
          }
          return;
        }
        aplicarDadosCnpj(json.dados);
        if (!silencioso) {
          window.alert("Dados da empresa preenchidos automaticamente.");
        }
      } catch {
        if (!silencioso) {
          window.alert("Erro ao consultar CNPJ. Verifique sua conexão.");
        }
      } finally {
        consultasEmAndamento.current.delete(chave);
        setCnpjLoading(false);
      }
    },
    [aplicarDadosCnpj, form.cnpj, prefix],
  );

  useEffect(() => {
    if (!open) return;
    const cnpj = apenasDigitos(form.cnpj);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cnpj.length !== 14) return;
    debounceRef.current = setTimeout(() => {
      void buscarCnpj(true);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.cnpj, open, buscarCnpj]);

  async function buscarCep() {
    const cep = apenasDigitos(form.cep ?? "");
    if (cep.length !== 8) {
      window.alert("Informe um CEP válido (8 dígitos).");
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        window.alert("CEP não encontrado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    } catch {
      window.alert("Erro ao buscar CEP.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, fornecedor?.id);
      onClose();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal open={open} onClose={onClose} dialogClass="modal-lg dash-fornecedor-modal">
      <div className="modal-content">
        <div className="modal-header dash-edit-modal__header">
          <div className="dash-edit-modal__head">
            <span className="dash-edit-modal__head-icon" aria-hidden="true">
              <i className="bi bi-building" />
            </span>
            <div>
              <h4 className="modal-title mb-0">
                {fornecedor ? "Editar fornecedor" : "Cadastrar fornecedor"}
              </h4>
              <p className="mb-0 small text-muted">CNPJ, contato e endereço da empresa</p>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>
        <div className="modal-body">
      <form className="dash-form" onSubmit={(e) => void submit(e)}>
        <div className={`row g-2${cnpjLoading ? " forn-cnpj-loading" : ""}`}>
          <div className="col-12 col-md-5">
            <label className="form-label" htmlFor={`${prefix}-cnpj`}>
              CNPJ
            </label>
            <div className={`input-group dash-input-group forn-doc-input-wrap${cnpjLoading ? " forn-cnpj-loading" : ""}`}>
              <input
                id={`${prefix}-cnpj`}
                className="form-control forn-cnpj-input"
                value={formatCnpjInput(form.cnpj)}
                onChange={(e) => setField("cnpj", apenasDigitos(e.target.value))}
                onBlur={() => {
                  if (apenasDigitos(form.cnpj).length === 14) void buscarCnpj(true);
                }}
                required
                inputMode="numeric"
              />
              <button
                type="button"
                className="btn btn-group-custom forn-buscar-cnpj"
                onClick={() => void buscarCnpj(false)}
                disabled={cnpjLoading}
                title="Buscar dados pelo CNPJ"
              >
                <i className="bi bi-search" aria-hidden="true" />
              </button>
            </div>
            {fornecedor ? (
              <p className="form-text mb-0">{formatCnpjExib(fornecedor.cnpj)}</p>
            ) : null}
          </div>
          <div className="col-12 col-md-7">
            <label className="form-label" htmlFor={`${prefix}-razao`}>
              Razão social
            </label>
            <input
              id={`${prefix}-razao`}
              className="form-control"
              value={form.razao_social}
              onChange={(e) => setField("razao_social", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor={`${prefix}-fantasia`}>
              Nome fantasia
            </label>
            <input
              id={`${prefix}-fantasia`}
              className="form-control"
              value={form.nome_fantasia}
              onChange={(e) => setField("nome_fantasia", e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor={`${prefix}-contato`}>
              Contato na empresa
            </label>
            <input
              id={`${prefix}-contato`}
              className="form-control"
              value={form.contato_nome}
              onChange={(e) => setField("contato_nome", e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor={`${prefix}-email`}>
              E-mail
            </label>
            <input
              id={`${prefix}-email`}
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor={`${prefix}-telefone`}>
              Telefone
            </label>
            <input
              id={`${prefix}-telefone`}
              type="tel"
              className="form-control"
              value={form.telefone}
              onChange={(e) => setField("telefone", e.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor={`${prefix}-cep`}>
              CEP
            </label>
            <div className="input-group dash-input-group">
              <input
                id={`${prefix}-cep`}
                className="form-control forn-cep-input"
                value={formatCepInput(form.cep ?? "")}
                onChange={(e) => setField("cep", apenasDigitos(e.target.value))}
              />
              <button type="button" className="btn btn-group-custom" onClick={() => void buscarCep()} title="Buscar CEP">
                <i className="bi bi-search" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label" htmlFor={`${prefix}-endereco`}>
              Logradouro
            </label>
            <input
              id={`${prefix}-endereco`}
              className="form-control"
              value={form.endereco}
              onChange={(e) => setField("endereco", e.target.value)}
            />
          </div>
          <div className="col-4 col-md-1">
            <label className="form-label" htmlFor={`${prefix}-numero`}>
              Nº
            </label>
            <input
              id={`${prefix}-numero`}
              className="form-control"
              value={form.numero}
              onChange={(e) => setField("numero", e.target.value)}
            />
          </div>
          <div className="col-8 col-md-3">
            <label className="form-label" htmlFor={`${prefix}-cidade`}>
              Cidade / UF
            </label>
            <div className="input-group">
              <input
                id={`${prefix}-cidade`}
                className="form-control"
                value={form.cidade}
                onChange={(e) => setField("cidade", e.target.value)}
              />
              <input
                className="form-control text-uppercase"
                style={{ maxWidth: "4rem" }}
                maxLength={2}
                value={form.uf}
                onChange={(e) => setField("uf", e.target.value.toUpperCase())}
                aria-label="UF"
              />
            </div>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor={`${prefix}-obs`}>
              Observação
            </label>
            <textarea
              id={`${prefix}-obs`}
              className="form-control"
              rows={2}
              value={form.observacao}
              onChange={(e) => setField("observacao", e.target.value)}
            />
          </div>
        </div>
        <div className="dash-edit-modal__footer mt-3">
          <button type="button" className="analytics-btn analytics-btn--outline analytics-btn--sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="analytics-btn analytics-btn--primary analytics-btn--sm" disabled={saving}>
            {saving ? "Salvando…" : fornecedor ? "Salvar alterações" : "Cadastrar fornecedor"}
          </button>
        </div>
      </form>
        </div>
      </div>
    </AdminModal>
  );
}
