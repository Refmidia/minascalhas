import type { DashConfirmOptions } from "@/components/admin/DashConfirmModal";

export type DashToastVariant = "success" | "danger" | "warning" | "info";

export type DashToastItem = {
  id: string;
  message: string;
  variant: DashToastVariant;
};

export type DashAlertOptions = {
  title?: string;
  message: string;
  variant?: DashToastVariant;
  okText?: string;
  icon?: string;
};

type ConfirmRequest = {
  options: DashConfirmOptions;
  resolve: (value: boolean) => void;
};

type AlertRequest = {
  options: DashAlertOptions;
  resolve: () => void;
};

export type DashUiState = {
  toasts: DashToastItem[];
  confirm: ConfirmRequest | null;
  alert: AlertRequest | null;
};

let state: DashUiState = { toasts: [], confirm: null, alert: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeDashUi(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDashUiState(): DashUiState {
  return state;
}

export function pushDashToast(message: string, variant: DashToastVariant = "success") {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random()}`;
  state = {
    ...state,
    toasts: [...state.toasts, { id, message, variant }].slice(-5),
  };
  emit();
  window.setTimeout(() => removeDashToast(id), 4200);
}

export function removeDashToast(id: string) {
  if (!state.toasts.some((t) => t.id === id)) return;
  state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
  emit();
}

export function openDashConfirm(options: DashConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    state = { ...state, confirm: { options, resolve } };
    emit();
  });
}

export function settleDashConfirm(confirmed: boolean) {
  const req = state.confirm;
  if (!req) return;
  state = { ...state, confirm: null };
  emit();
  req.resolve(confirmed);
}

export function openDashAlert(options: DashAlertOptions): Promise<void> {
  return new Promise((resolve) => {
    state = { ...state, alert: { options, resolve } };
    emit();
  });
}

export function settleDashAlert() {
  const req = state.alert;
  if (!req) return;
  state = { ...state, alert: null };
  emit();
  req.resolve();
}
