import { useState, FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const required: (keyof FormState)[] = ["nome", "telefone", "endereco", "bairro", "numero", "data", "hora"];
    for (const k of required) {
      if (!form[k].trim()) {
        setStatus("error");
        setErrorMsg("Preencha todos os campos obrigatórios.");
        return;
      }
    }

    const payload = {
      nome: form.nome,
      cpfCnpj: form.cpfCnpj || undefined,
      telefone: form.telefone,
      endereco: form.endereco,
      bairro: form.bairro,
      cep: form.cep || undefined,
      numero: form.numero,
      data: form.data,
      hora: form.hora,
      observacao: form.observacao || undefined,
      origem: "site" as const,
    };

    setStatus("loading");
    try {
      // Pronto para integração futura com API REST + MySQL
      console.log("[Agendamento] payload:", payload);
      // await fetch("/api/agendamentos", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      await new Promise((r) => setTimeout(r, 800));
      setStatus("success");
      setForm(initial);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Não foi possível enviar. Tente novamente.");
    }
  }

  return (
    <section id="agendar" className="bg-brand-green-mist py-24 lg:py-32">
      <div className="mx-auto max-w-[980px] px-6">
        <div className="bg-white rounded-[24px] shadow-xl border border-brand-border/60 p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy">Agendar visita</h2>
          <p className="mt-2 text-brand-muted">
            Preencha os dados — o agendamento aparece na área administrativa na hora.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Nome *</label>
              <input className={inputCls} value={form.nome} onChange={set("nome")} placeholder="Seu nome completo" />
            </div>
            <div>
              <label className={labelCls}>CPF / CNPJ</label>
              <input className={inputCls} value={form.cpfCnpj} onChange={set("cpfCnpj")} placeholder="Opcional" />
            </div>

            <div>
              <label className={labelCls}>Telefone *</label>
              <input className={inputCls} value={form.telefone} onChange={set("telefone")} placeholder="(18) 99999-9999" />
            </div>
            <div>
              <label className={labelCls}>Endereço *</label>
              <input className={inputCls} value={form.endereco} onChange={set("endereco")} placeholder="Rua / Avenida" />
            </div>

            <div>
              <label className={labelCls}>Bairro *</label>
              <input className={inputCls} value={form.bairro} onChange={set("bairro")} placeholder="Bairro" />
            </div>
            <div>
              <label className={labelCls}>CEP</label>
              <div className="flex gap-2">
                <input className={inputCls} value={form.cep} onChange={set("cep")} placeholder="00000-000" />
                <button type="button" className="rounded-xl bg-brand-green-soft text-brand-green font-semibold px-4 text-sm hover:bg-brand-green-soft/70 border border-brand-green/20">
                  Buscar
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Nº *</label>
              <input className={inputCls} value={form.numero} onChange={set("numero")} placeholder="123" />
            </div>
            <div>
              <label className={labelCls}>Data *</label>
              <input type="date" className={inputCls} value={form.data} onChange={set("data")} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Hora *</label>
              <input type="time" className={inputCls + " sm:max-w-xs"} value={form.hora} onChange={set("hora")} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Observação</label>
              <textarea rows={4} className={inputCls} value={form.observacao} onChange={set("observacao")} placeholder="Detalhes do serviço, melhores horários, etc." />
            </div>

            {status === "success" && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-brand-green-soft text-brand-green-dark px-4 py-3 text-sm font-medium">
                <CheckCircle2 size={18} /> Agendamento enviado com sucesso.
              </div>
            )}
            {status === "error" && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green hover:bg-brand-green-dark disabled:opacity-70 text-white font-semibold px-6 py-4 transition shadow-sm"
              >
                {status === "loading" && <Loader2 size={18} className="animate-spin" />}
                Agendar
              </button>
              <p className="mt-4 text-center text-sm text-brand-muted">
                Prefere falar agora?{" "}
                <a href="https://wa.me/5518996475269" target="_blank" rel="noreferrer" className="text-brand-green font-semibold hover:underline">
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
