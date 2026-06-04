import type { ReactNode } from "react";

import type { AgendamentoItem } from "@/lib/admin-api";
import { formatHoraVisitaExibicao } from "@/lib/inventario-format";
import { formatarTelefone, telefoneWhatsappLink } from "@/lib/format-br";
import {
  buildEnderecoCompleto,
  googleMapsUrlEndereco,
  joinEnderecoParts,
  type EnderecoParts,
} from "@/lib/inventario-format";

const PER_PAGE = 9;

export { PER_PAGE as INVENTARIO_PER_PAGE };

export function ListingHeaderMeta({
  total,
  page,
  totalPages,
}: {
  total: number;
  page: number;
  totalPages: number;
}) {
  const registroLabel = total === 1 ? "registro" : "registros";
  const pages = Math.max(1, totalPages);

  return (
    <div className="dash-page-header__meta" aria-label="Resumo da listagem">
      <span className="dash-page-header__meta-item">
        <strong>{total}</strong> {registroLabel}
      </span>
      <span className="dash-page-header__meta-sep" aria-hidden="true">
        ·
      </span>
      <span className="dash-page-header__meta-item dash-page-header__meta-item--muted">
        Pág. {page}/{pages}
      </span>
    </div>
  );
}

export function TelefoneCell({ telefone }: { telefone: string }) {
  const fmt = formatarTelefone(telefone);
  const wa = telefoneWhatsappLink(telefone);
  if (!wa) return <span className="inv-telefone-text">{fmt}</span>;
  return (
    <a
      href={wa}
      className="inv-whats-chip"
      target="_blank"
      rel="noopener noreferrer"
      title="Chamar no WhatsApp"
    >
      <i className="bi bi-whatsapp" aria-hidden="true" />
      <span>{fmt}</span>
    </a>
  );
}

export function VisitaDataCell({ data }: { data: string }) {
  const d = data.trim();
  if (!d) return <span className="inv-detail-empty">—</span>;
  return <span className="inv-visita-data">{d}</span>;
}

export function VisitaHoraCell({ hora }: { hora: string }) {
  const h = formatHoraVisitaExibicao(hora);
  if (!h) return <span className="inv-detail-empty">—</span>;
  return (
    <span className="inv-visita-hora" title="Horário do agendamento">
      {h}
    </span>
  );
}

/** Endereço clicável — abre Google Maps. Em tabelas usa chip compacto "Mapa" (endereço só no tooltip). */
export function EnderecoLink({
  endereco,
  title,
  compact = false,
}: {
  endereco: string;
  title?: string;
  /** Na listagem: só ícone + "Mapa", sem texto longo na célula. */
  compact?: boolean;
}) {
  const texto = endereco.trim();
  if (!texto) return <span className="inv-detail-empty">—</span>;

  const mapsUrl = googleMapsUrlEndereco(texto);
  const tooltip = title ?? texto;

  return (
    <a
      href={mapsUrl}
      className={`inv-maps-chip${compact ? " inv-maps-chip--compact" : ""}`}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      aria-label={`Abrir no mapa: ${tooltip}`}
    >
      <i className="bi bi-geo-alt" aria-hidden="true" />
      {compact ? <span>Mapa</span> : <span className="inv-maps-chip__text">{texto}</span>}
    </a>
  );
}

export function EnderecoPartsCell({
  parts,
  compact = true,
}: {
  parts: EnderecoParts;
  compact?: boolean;
}) {
  return <EnderecoLink endereco={joinEnderecoParts(parts)} compact={compact} />;
}

export function EnderecoCell({
  item,
  compact = true,
}: {
  item: AgendamentoItem;
  compact?: boolean;
}) {
  return <EnderecoLink endereco={buildEnderecoCompleto(item)} compact={compact} />;
}

export { InvActionBtn, InvRowActions } from "@/components/admin/admin-row-actions";

export function InvPagination({
  page,
  totalPages,
  total,
  perPage = PER_PAGE,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage?: number;
  onPageChange: (p: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  const pag = Math.max(1, Math.min(page, pages));
  const from = total > 0 ? (pag - 1) * perPage + 1 : 0;
  const to = total > 0 ? Math.min(pag * perPage, total) : 0;
  const links = 5;

  const prevPages: number[] = [];
  for (let i = pag - links; i <= pag - 1; i++) {
    if (i > 0) prevPages.push(i);
  }
  const nextPages: number[] = [];
  for (let i = pag + 1; i <= pag + links; i++) {
    if (i <= pages) nextPages.push(i);
  }

  return (
    <footer className="inv-list-footer">
      <p className="inv-list-footer__info">
        {total > 0 ? (
          <>
            Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong>
          </>
        ) : (
          "Nenhum registro para exibir"
        )}
      </p>
      <nav className="inv-pagination" aria-label="Paginação">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item${pag <= 1 ? " disabled" : ""}`}>
            <button
              type="button"
              className="page-link"
              aria-label="Primeira"
              disabled={pag <= 1}
              onClick={() => onPageChange(1)}
            >
              &laquo;
            </button>
          </li>
          {prevPages.map((n) => (
            <li key={n} className="page-item">
              <button type="button" className="page-link" onClick={() => onPageChange(n)}>
                {n}
              </button>
            </li>
          ))}
          <li className="page-item active">
            <span className="page-link">{pag}</span>
          </li>
          {nextPages.map((n) => (
            <li key={n} className="page-item">
              <button type="button" className="page-link" onClick={() => onPageChange(n)}>
                {n}
              </button>
            </li>
          ))}
          <li className={`page-item${pag >= pages ? " disabled" : ""}`}>
            <button
              type="button"
              className="page-link"
              aria-label="Última"
              disabled={pag >= pages}
              onClick={() => onPageChange(pages)}
            >
              &raquo;
            </button>
          </li>
        </ul>
      </nav>
    </footer>
  );
}

export function paginateItems<T>(items: T[], page: number, perPage = PER_PAGE): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}
