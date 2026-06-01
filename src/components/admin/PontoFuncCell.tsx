import { primeiroNome } from "@/lib/funcionario-pagamento-display";
import { UserThumb } from "@/components/admin/UserThumb";

export function PontoFuncCell({ nome, thumb = "" }: { nome: string; thumb?: string }) {
  return (
    <div className="dash-ponto-func">
      <span className="dash-ponto-func__nome" title={nome}>
        {primeiroNome(nome)}
      </span>
      <UserThumb nome={nome} thumb={thumb} size="sm" className="dash-ponto-func__avatar" />
    </div>
  );
}

function PontoCelulaHora({ valor }: { valor: string }) {
  if (!valor || valor === "—") {
    return <span className="dash-ponto-cel--vazio">—</span>;
  }
  return <span className="dash-ponto-cel--hora">{valor}</span>;
}

export function PontoJornadaHoras({
  entrada,
  almoco,
  retorno,
  saida,
  intervalo,
  total,
}: {
  entrada: string;
  almoco: string;
  retorno: string;
  saida: string;
  intervalo: string;
  total: string;
}) {
  return (
    <>
      <td className="text-center">
        <PontoCelulaHora valor={entrada} />
      </td>
      <td className="text-center">
        <PontoCelulaHora valor={almoco} />
      </td>
      <td className="text-center">
        <PontoCelulaHora valor={retorno} />
      </td>
      <td className="text-center">
        <PontoCelulaHora valor={saida} />
      </td>
      <td className="text-center">
        <PontoCelulaHora valor={intervalo} />
      </td>
      <td className="text-center dash-ponto-cel--total">
        <strong>{total === "—" ? <span className="dash-ponto-cel--vazio">—</span> : total}</strong>
      </td>
    </>
  );
}
