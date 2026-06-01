import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Alex Calhas" },
      { name: "description", content: "Área administrativa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Painel,
});

function Painel() {
  return (
    <main className="min-h-screen bg-brand-green-mist grid place-items-center px-6">
      <div className="max-w-md w-full bg-white rounded-[22px] shadow-xl border border-brand-border/60 p-10 text-center">
        <span className="inline-flex items-center rounded-full border border-brand-green/30 bg-white text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
          ÁREA ADMINISTRATIVA
        </span>
        <h1 className="mt-5 text-2xl font-bold text-brand-navy">Painel</h1>
        <p className="mt-3 text-brand-muted text-sm">
          O painel administrativo será conectado ao backend MySQL para listar e
          gerenciar os agendamentos enviados pelo site.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-dark text-white font-semibold px-6 py-3 transition"
        >
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
