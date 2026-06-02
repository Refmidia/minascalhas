import { useEffect, useState, type ReactNode } from "react";

import { DashAlertModal } from "@/components/admin/DashAlertModal";
import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import { DashToastStack } from "@/components/admin/DashToastStack";
import {
  getDashUiState,
  settleDashAlert,
  settleDashConfirm,
  subscribeDashUi,
} from "@/lib/dash-ui-store";

export function DashUiProvider({ children }: { children: ReactNode }) {
  const [, tick] = useState(0);

  useEffect(() => subscribeDashUi(() => tick((n) => n + 1)), []);

  const { toasts, confirm, alert } = getDashUiState();

  return (
    <>
      {children}
      <DashToastStack toasts={toasts} />
      <DashConfirmModal
        open={confirm !== null}
        options={confirm?.options ?? null}
        onConfirm={() => settleDashConfirm(true)}
        onCancel={() => settleDashConfirm(false)}
      />
      <DashAlertModal
        open={alert !== null}
        options={alert?.options ?? null}
        onClose={() => settleDashAlert()}
      />
    </>
  );
}
