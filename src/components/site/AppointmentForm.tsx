import { useId, useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { CONTACT } from "@/data/site";
import { agendamentoSchema } from "@/lib/validation";
import { enviarAgendamento } from "@/lib/agendamentos";

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
  nome: "", cpfCnpj: "", telefone: "", endereco: "", bairro: "",
  cep: "", numero: "", data: "", hora: "", observacao: "",
};

const inputCls =
  "w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-navy placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition";
const labelCls = "block text-xs font-semibold text-brand-navy mb-1.5";

export function AppointmentForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const baseId = useId();
  const fid = (name: string) => `${baseId}-${name}`;

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const parsed = agendamentoSchema.safeParse({ ...form, origem: "site" });
    if (!parsed.success) {
      setStatus("error");
      const first = parsed.error.issues[0]?.message ?? "Preencha todos os campos obrigatórios.";
      setErrorMsg(first);
      return;
    }

    setStatus("loading");
    try {
      await enviarAgendamento(parsed.data);
      setStatus("success");
      setForm(initial);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Não foi possível enviar.");
    }
  }

  return (
    <section id="agendar" className="bg-brand-green-mist py-24 lg:py-32" aria-labelledby="agendar-title">
      <div className="mx-auto max-w-[980px] px-6">
        <div className="bg-white rounded-[24px] shadow-xl border border-brand-border/60 p-8 sm:p-12">
          <h2 id="agendar-title" className="text-3xl sm:text-4xl font-bold text-brand-navy">Agendar visita</h2>
          <p className="mt-2 text-brand-muted">
            Preencha os dados — o agendamento aparece na área administrativa na hora.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor={fid("nome")} className={labelCls}>Nome *</label>
              <input id={fid("nome")} required autoComplete="name" className={inputCls} value={form.nome} onChange={set("nome")} placeholder="Seu nome completo" />
            </div>
            <div>
              <label htmlFor={fid("cpf")} className={labelCls}>CPF / CNPJ</label>
              <input id={fid("cpf")} autoComplete="off" className={inputCls} value={form.cpfCnpj} onChange={set("cpfCnpj")} placeholder="Opcional" />
            </div>

            <div>
              <label htmlFor={fid("tel")} className={labelCls}>Telefone *</label>
              <input id={fid("tel")} required inputMode="tel" autoComplete="tel" className={inputCls} value={form.telefone} onChange={set("telefone")} placeholder="(18) 99999-9999" />
            </div>
            <div>
              <label htmlFor={fid("end")} className={labelCls}>Endereço *</label>
              <input id={fid("end")} required autoComplete="street-address" className={inputCls} value={form.endereco} onChange={set("endereco")} placeholder="Rua / Avenida" />
            </div>

            <div>
              <label htmlFor={fid("bairro")} className={labelCls}>Bairro *</label>
              <input id={fid("bairro")} required className={inputCls} value={form.bairro} onChange={set("bairro")} placeholder="Bairro" />
            </div>
            <div>
              <label htmlFor={fid("cep")} className={labelCls}>CEP</label>
              <div className="flex gap-2">
                <input id={fid("cep")} inputMode="numeric" autoComplete="postal-code" className={inputCls} value={form.cep} onChange={set("cep")} placeholder="00000-000" />
                <button type="button" aria-label="Buscar endereço pelo CEP" className="rounded-xl bg-brand-green-soft text-brand-green font-semibold px-4 text-sm hover:bg-brand-green-soft/70 border border-brand-green/20">
                  Buscar
                </button>
              </div>
            </div>

            <div>
              <label htmlFor={fid("num")} className={labelCls}>Nº *</label>
              <input id={fid("num")} required inputMode="numeric" className={inputCls} value={form.numero} onChange={set("numero")} placeholder="123" />
            </div>
            <div>
              <label htmlFor={fid("data")} className={labelCls}>Data *</label>
              <input id={fid("data")} required type="date" className={inputCls} value={form.data} onChange={set("data")} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={fid("hora")} className={labelCls}>Hora *</label>
              <input id={fid("hora")} required type="time" className={inputCls + " sm:max-w-xs"} value={form.hora} onChange={set("hora")} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={fid("obs")} className={labelCls}>Observação</label>
              <textarea id={fid("obs")} rows={4} maxLength={1000} className={inputCls} value={form.observacao} onChange={set("observacao")} placeholder="Detalhes do serviço, melhores horários, etc." />
            </div>

            <div className="sm:col-span-2" role="status" aria-live="polite">
              {status === "success" && (
                <div className="flex items-center gap-2 rounded-xl bg-brand-green-soft text-brand-green-dark px-4 py-3 text-sm font-medium">
                  <CheckCircle2 size={18} aria-hidden="true" /> Agendamento enviado com sucesso.
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
                  <AlertCircle size={18} aria-hidden="true" /> {errorMsg}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green hover:bg-brand-green-dark disabled:opacity-70 text-white font-semibold px-6 py-4 transition shadow-sm"
              >
                {status === "loading" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {status === "loading" ? "Enviando..." : "Agendar"}
              </button>
              <p className="mt-4 text-center text-sm text-brand-muted">
                Prefere falar agora?{" "}
                <a href={CONTACT.whatsappLink} target="_blank" rel="noreferrer" className="text-brand-green font-semibold hover:underline">
                  WhatsApp
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
