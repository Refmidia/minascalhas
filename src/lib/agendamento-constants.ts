/** Status reais da tabela `inventario` no MySQL. */
export const INVENTARIO_STATUS = [
  "agendado",
  "confirmado",
  "orcamentado",
  "finalizado",
] as const;

export type InventarioStatus = (typeof INVENTARIO_STATUS)[number];

/** @deprecated use INVENTARIO_STATUS */
export const AGENDAMENTO_STATUS = INVENTARIO_STATUS;
export type AgendamentoStatus = InventarioStatus;
