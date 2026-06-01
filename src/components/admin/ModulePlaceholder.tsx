import { AdminPageHeader } from "@/components/admin/AdminShell";

export function ModulePlaceholder({
  title,
  subtitle,
  phpPath,
}: {
  title: string;
  subtitle?: string;
  phpPath?: string;
}) {
  return (
    <>
      <AdminPageHeader title={title} subtitle={subtitle} showNovaVisita={false} />
      <div className="rounded-xl bg-[#1a222d] border border-amber-500/30 p-8 max-w-xl">
        <p className="text-amber-400 font-semibold">Migração em andamento</p>
        <p className="text-slate-400 text-sm mt-2">
          Esta tela do sistema PHP ({phpPath ?? title}) está na fila de port para o site novo.
          Enquanto isso, use <strong className="text-white">Visitas</strong>,{" "}
          <strong className="text-white">Painel</strong>, <strong className="text-white">Produtos</strong> e{" "}
          <strong className="text-white">Clientes</strong> já disponíveis aqui.
        </p>
      </div>
    </>
  );
}
