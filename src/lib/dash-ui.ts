import type { DashConfirmOptions } from "@/components/admin/DashConfirmModal";
import {
  openDashAlert,
  openDashConfirm,
  pushDashToast,
  type DashAlertOptions,
  type DashToastVariant,
} from "@/lib/dash-ui-store";

export type { DashAlertOptions, DashToastVariant };
export type { DashConfirmOptions };

/** Notificação elegante (canto inferior direito). */
export function dashToast(message: string, variant: DashToastVariant = "success") {
  pushDashToast(message, variant);
}

/** Modal de confirmação (substitui `window.confirm`). */
export function dashConfirm(options: DashConfirmOptions): Promise<boolean> {
  return openDashConfirm(options);
}

/** Atalho para confirmação com mensagem simples. */
export function dashConfirmMessage(
  message: string,
  title = "Confirmar",
  variant: DashConfirmOptions["variant"] = "primary",
): Promise<boolean> {
  return openDashConfirm({ title, message, variant });
}

/** Modal de aviso com um botão (substitui `window.alert`). */
export function dashAlert(options: DashAlertOptions | string): Promise<void> {
  if (typeof options === "string") {
    return openDashAlert({ message: options, title: "Aviso", variant: "info" });
  }
  return openDashAlert({
    title: options.title ?? "Aviso",
    variant: options.variant ?? "info",
    ...options,
  });
}
