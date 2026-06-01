import type { InventarioStatus } from "@/lib/agendamento-constants";

export type ListingSlug = InventarioStatus;

export const INVENTARIO_LISTING_META: Record<
  ListingSlug,
  {
    title: string;
    subtitle: string;
    icon: string;
    slug: ListingSlug;
    emptyTitle: string;
    emptyText: string;
  }
> = {
  agendado: {
    slug: "agendado",
    title: "Visitas",
    subtitle: "Clientes com visita agendada aguardando confirmação e orçamento.",
    icon: "bi-calendar-check",
    emptyTitle: "Nenhuma visita agendada",
    emptyText: "Quando você agendar uma nova visita, ela aparecerá aqui.",
  },
  orcamentado: {
    slug: "orcamentado",
    title: "Orçamentado",
    subtitle: "Serviços com orçamento enviado aguardando confirmação de montagem.",
    icon: "bi-receipt",
    emptyTitle: "Nenhum orçamento pendente",
    emptyText: "Confirme visitas na etapa anterior ou envie novos orçamentos.",
  },
  confirmado: {
    slug: "confirmado",
    title: "Confirmado",
    subtitle: "Montagens confirmadas em andamento até a conclusão do serviço.",
    icon: "bi-patch-check",
    emptyTitle: "Nenhum serviço confirmado",
    emptyText: "Serviços confirmados no orçamento serão listados aqui.",
  },
  finalizado: {
    slug: "finalizado",
    title: "Finalizado",
    subtitle: "Histórico de serviços concluídos e entregues ao cliente.",
    icon: "bi-flag-fill",
    emptyTitle: "Nenhum serviço finalizado",
    emptyText: "Ao concluir um serviço confirmado, ele será arquivado nesta lista.",
  },
};
