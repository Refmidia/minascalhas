import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { DashPageHero } from "@/components/admin/DashPageHero";
import { criarVisitaPainel } from "@/lib/admin-api";
import { fetchConsultaDocumento } from "@/lib/consulta-client";
import { agendamentoSchema } from "@/lib/validation";

function maskCpfCnpj(digits: string): string {
  const v = digits.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCep(digits: string): string {
  const v = digits.replace(/\D/g, "").slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
}

function maskTelefone(digits: string): string {
  const v = digits.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

type FormState = {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cep: string;
  numero: string;
  data: string;
  hora: string;
  observacao: string;
};

const initial: FormState = {
  nome: "",
  cpfCnpj: "",
  telefone: "",
  endereco: "",
  bairro: "",
  cep: "",
  numero: "",
  data: "",
  hora: "",
  observacao: "",
};

export function AgendarVisitaForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docHint, setDocHint] = useState("CNPJ busca na Receita; CPF usa cadastros anteriores.");
  const [docHintType, setDocHintType] = useState<"" | "ok" | "warn">("");
  const nomeEditadoManual = useRef(false);
  const docLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const setDocHintMsg = useCallback((text: string, type: "" | "ok" | "warn" = "") => {
    setDocHint(text);
    setDocHintType(type);
  }, []);

  const preencherCliente = useCallback(
    (data: {
      nome?: string | null;
      telefone?: string | null;
      cep?: string | null;
      endereco?: string | null;
      bairro?: string | null;
      numero?: string | null;
    }) => {
      setForm((f) => {
        const next = { ...f };
        if (data.nome && (!nomeEditadoManual.current || !f.nome.trim())) {
          next.nome = data.nome;
          nomeEditadoManual.current = false;
        }
        if (data.telefone) next.telefone = maskTelefone(data.telefone.replace(/\D/g, ""));
        if (data.cep) next.cep = maskCep(data.cep.replace(/\D/g, ""));
        if (data.endereco) next.endereco = data.endereco;
        if (data.bairro) next.bairro = data.bairro;
        if (data.numero) next.numero = data.numero;
        return next;
      });
    },
    [],
  );

  const agendarDocLookup = useCallback(() => {
    if (docLookupTimer.current) clearTimeout(docLookupTimer.current);
    const digits = form.cpfCnpj.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setDocLoading(false);
      setDocHintMsg("CNPJ busca na Receita; CPF usa cadastros anteriores.");
      return;
    }
    docLookupTimer.current = setTimeout(() => {
      setDocLoading(true);
      void fetchConsultaDocumento(digits)
        .then((data) => {
          if (data.status === "sucesso") {
            preencherCliente(data);
            const fonte =
              data.fonte === "receita"
                ? "Receita Federal"
                : data.fonte === "cache"
                  ? "memória do sistema"
                  : "cadastro anterior";
            const extras: string[] = [];
            if (data.telefone) extras.push("telefone");
            if (data.cep || data.endereco) extras.push("endereço");
            const msgExtra = extras.length ? ` — ${extras.join(" e ")} preenchidos` : "";
            setDocHintMsg(`Dados encontrados (${fonte})${msgExtra}.`, "ok");
          } else {
            setDocHintMsg(data.mensagem || "Documento não encontrado.", "warn");
          }
        })
        .catch((err) =>
          setDocHintMsg(err instanceof Error ? err.message : "Erro ao consultar documento.", "warn"),
        )
        .finally(() => setDocLoading(false));
    }, 700);
  }, [form.cpfCnpj, preencherCliente, setDocHintMsg]);

  useEffect(() => {
    agendarDocLookup();
    return () => {
      if (docLookupTimer.current) clearTimeout(docLookupTimer.current);
    };
  }, [form.cpfCnpj, agendarDocLookup]);

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = (await res.json()) as { logradouro?: string; bairro?: string; erro?: boolean };
      if (j.erro) return;
      setForm((f) => ({
        ...f,
        endereco: j.logradouro || f.endereco,
        bairro: j.bairro || f.bairro,
      }));
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = agendamentoSchema.safeParse({ ...form, origem: "site" });
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setStatus("loading");
    try {
      await criarVisitaPainel(parsed.data);
      setStatus("success");
      setForm(initial);
      nomeEditadoManual.current = false;
      setDocHintMsg("CNPJ busca na Receita; CPF usa cadastros anteriores.");
      setTimeout(() => void navigate({ to: "/painel/visitas" }), 1200);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao agendar.");
    }
  }

  return (
    <div className="dash-form-page dash-form-page--pro dashboard-page--agendar">
      <DashPageHero
        layout="form"
        title="Agendar visita"
        subtitle="Dados do cliente, endereço e horário da visita"
        iconClass="bi-calendar-plus"
        cta={
          <Link to="/painel/visitas" className="dash-form-page__cta">
            <i className="bi bi-journal-text" aria-hidden="true" />
            <span>Ver visitas</span>
          </Link>
        }
      />

      <form className="dash-form" name="cadastro" id="cadastro" onSubmit={handleSubmit} noValidate>
        <div className="dash-page-body dash-page-body--solo">
          {status === "success" ? (
            <div className="alert alert-success d-flex align-items-center gap-2 mb-3" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              Visita agendada com sucesso! Redirecionando…
            </div>
          ) : null}
          {status === "error" ? (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {errorMsg}
            </div>
          ) : null}

          <section className="dash-edit-modal__panel">
            <h2 className="dash-edit-modal__panel-title">
              <i className="bi bi-person" aria-hidden="true" /> Cliente
            </h2>
            <div className="row g-2">
              <div className="col-12 col-lg-5">
                <label className="dash-edit-modal__label" htmlFor="agendar-nome">
                  Nome *
                </label>
                <input
                  id="agendar-nome"
                  name="nome"
                  type="text"
                  className="form-control dash-edit-modal__input"
                  required
                  autoComplete="name"
                  value={form.nome}
                  onChange={(e) => {
                    nomeEditadoManual.current = true;
                    setForm((f) => ({ ...f, nome: e.target.value }));
                  }}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="dash-edit-modal__label" htmlFor="agendar-cpf">
                  CPF / CNPJ
                </label>
                <div className="dash-doc-field">
                  <input
                    id="agendar-cpf"
                    name="cpf-cnpj"
                    type="text"
                    className="form-control dash-edit-modal__input"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={18}
                    autoComplete="off"
                    value={form.cpfCnpj}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cpfCnpj: maskCpfCnpj(e.target.value) }))
                    }
                    onBlur={() => agendarDocLookup()}
                  />
                  <span
                    className={`dash-doc-field__loader${docLoading ? "" : " d-none"}`}
                    id="doc-loader"
                    aria-hidden="true"
                  />
                </div>
                <p
                  className={`dash-doc-hint mb-0${docHintType ? ` dash-doc-hint--${docHintType}` : ""}`}
                  id="doc-hint"
                >
                  {docHint}
                </p>
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <label className="dash-edit-modal__label" htmlFor="agendar-telefone">
                  Telefone *
                </label>
                <input
                  id="agendar-telefone"
                  name="telefone"
                  type="tel"
                  className="form-control dash-edit-modal__input"
                  required
                  placeholder="(69) 99999-9999"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefone: maskTelefone(e.target.value) }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="dash-edit-modal__panel">
            <h2 className="dash-edit-modal__panel-title">
              <i className="bi bi-geo-alt" aria-hidden="true" /> Endereço
            </h2>
            <div className="row g-2">
              <div className="col-12 col-sm-5 col-lg-3">
                <label className="dash-edit-modal__label" htmlFor="agendar-cep">
                  CEP
                </label>
                <div className="input-group dash-input-group-cep">
                  <input
                    id="agendar-cep"
                    name="cep"
                    type="text"
                    className="form-control dash-edit-modal__input"
                    placeholder="00000-000"
                    maxLength={9}
                    inputMode="numeric"
                    value={form.cep}
                    onChange={(e) => setForm((f) => ({ ...f, cep: maskCep(e.target.value) }))}
                    onBlur={() => void buscarCep()}
                  />
                  <button
                    type="button"
                    id="buscarCepBtn"
                    className="btn visitas-orc-add-btn"
                    title="Buscar CEP"
                    aria-label="Buscar CEP"
                    onClick={() => void buscarCep()}
                  >
                    <i className="bi bi-search" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="col-12 col-sm-7 col-lg-9">
                <label className="dash-edit-modal__label" htmlFor="agendar-endereco">
                  Endereço *
                </label>
                <input
                  id="agendar-endereco"
                  name="endereco"
                  type="text"
                  className="form-control dash-edit-modal__input"
                  required
                  value={form.endereco}
                  onChange={set("endereco")}
                />
              </div>
              <div className="col-12 col-sm-5 col-lg-4">
                <label className="dash-edit-modal__label" htmlFor="agendar-bairro">
                  Bairro *
                </label>
                <input
                  id="agendar-bairro"
                  name="bairro"
                  type="text"
                  className="form-control dash-edit-modal__input"
                  required
                  value={form.bairro}
                  onChange={set("bairro")}
                />
              </div>
              <div className="col-6 col-sm-3 col-lg-2">
                <label className="dash-edit-modal__label" htmlFor="agendar-numero">
                  Nº *
                </label>
                <input
                  id="agendar-numero"
                  name="numero"
                  type="text"
                  className="form-control dash-edit-modal__input"
                  required
                  value={form.numero}
                  onChange={set("numero")}
                />
              </div>
            </div>
          </section>

          <section className="dash-edit-modal__panel dash-form-page__panel-last">
            <h2 className="dash-edit-modal__panel-title">
              <i className="bi bi-calendar-event" aria-hidden="true" /> Agendamento
            </h2>
            <div className="row g-2 align-items-end">
              <div className="col-6 col-sm-4 col-lg-2">
                <label className="dash-edit-modal__label" htmlFor="agendar-data">
                  Data *
                </label>
                <input
                  id="agendar-data"
                  name="data"
                  type="date"
                  className="form-control dash-edit-modal__input"
                  required
                  value={form.data}
                  onChange={set("data")}
                />
              </div>
              <div className="col-6 col-sm-4 col-lg-2">
                <label className="dash-edit-modal__label" htmlFor="agendar-hora">
                  Hora *
                </label>
                <input
                  id="agendar-hora"
                  name="hora"
                  type="time"
                  className="form-control dash-edit-modal__input"
                  required
                  value={form.hora}
                  onChange={set("hora")}
                />
              </div>
              <div className="col-12 col-sm-4 col-lg-auto ms-lg-auto">
                <div className="dash-form-page__actions">
                  <button
                    type="reset"
                    className="btn dash-edit-modal__btn-cancel"
                    onClick={() => setForm(initial)}
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    name="cadastro"
                    className="btn dash-edit-modal__btn-save"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <Loader2 className="spin" size={18} aria-hidden="true" />
                    ) : (
                      <i className="bi bi-calendar-plus" aria-hidden="true" />
                    )}
                    Agendar
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
