import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMonthBills = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        referenceMonth: z.string().optional(),
        filter: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const { listMonthBills } = await import("./bills.server");
    return listMonthBills(data?.referenceMonth, data?.filter);
  });

export const generateBills = createServerFn({ method: "POST" })
  .inputValidator(z.object({ referenceMonth: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const { generateMonthBills } = await import("./bills.server");
    return generateMonthBills(data?.referenceMonth);
  });

export const payBill = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      monthlyBillId: z.string().uuid().optional(),
      debtId: z.string().uuid().optional(),
      installmentId: z.string().uuid().optional(),
      amount: z.number().positive(),
      payment_date: z.string(),
      payment_method: z.string().nullable().optional(),
      account_used: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      attachment_url: z.string().nullable().optional(),
      is_full: z.boolean().optional(),
      idempotencyKey: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { registerBillPayment } = await import("./bills.server");
    return registerBillPayment(data);
  });

export const getDashboardMonth = createServerFn({ method: "GET" })
  .inputValidator(z.object({ referenceMonth: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const { fetchDashboardMonth } = await import("./bills.server");
    return fetchDashboardMonth(data?.referenceMonth);
  });

export const saveSplits = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      bundleKey: z.enum(["utilities_650", "fuel_food_1000"]),
      items: z.array(z.object({ name: z.string(), amount: z.number().nonnegative() })),
    }),
  )
  .handler(async ({ data }) => {
    const { saveBudgetSplit } = await import("./bills.server");
    return saveBudgetSplit(data);
  });

export const listSplits = createServerFn({ method: "GET" }).handler(async () => {
  const { getBudgetSplits } = await import("./bills.server");
  return getBudgetSplits();
});

export const getDebtDetailFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ debtId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getDebtDetail } = await import("./bills.server");
    return getDebtDetail(data.debtId);
  });

export const getBillDetailFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ billId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getBillDetail } = await import("./bills.server");
    return getBillDetail(data.billId);
  });

export const getRecurringDetailFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getRecurringDetail } = await import("./bills.server");
    return getRecurringDetail(data.accountId);
  });

/** Marca conta do mês como paga com 1 clique */
export const payBillQuick = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      monthlyBillId: z.string().uuid(),
      payment_date: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { registerBillPayment } = await import("./bills.server");
    const { query } = await import("./db.server");
    const { requireUser } = await import("./session.server");
    const user = await requireUser();
    const rows = await query<
      { id: string; expected_amount: number | string; paid_amount: number | string; name: string }[]
    >(
      `SELECT id, expected_amount, paid_amount, name FROM monthly_bills
       WHERE id = :id AND user_id = :userId LIMIT 1`,
      { id: data.monthlyBillId, userId: user.id },
    );
    if (!rows[0]) throw new Error("Conta não encontrada");
    const remaining = Math.max(0, Number(rows[0].expected_amount) - Number(rows[0].paid_amount));
    if (remaining <= 0) throw new Error("Esta conta já está paga");
    const payDate = data.payment_date || new Date().toISOString().slice(0, 10);
    return registerBillPayment({
      monthlyBillId: data.monthlyBillId,
      amount: remaining,
      payment_date: payDate,
      payment_method: "Pix",
      is_full: true,
      notes: `Pago rápido — ${rows[0].name}`,
      idempotencyKey: `quick-bill-${data.monthlyBillId}-${payDate}`,
    });
  });

/** Marca uma parcela como paga com um clique (valor cheio) */
export const payInstallmentQuick = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      installmentId: z.string().uuid(),
      debtId: z.string().uuid().optional(),
      payment_date: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { registerBillPayment } = await import("./bills.server");
    const { query } = await import("./db.server");
    const { requireUser } = await import("./session.server");
    const user = await requireUser();
    const rows = await query<{ id: string; amount: number | string; debt_id: string }[]>(
      `SELECT id, amount, debt_id FROM debt_installments
       WHERE id = :id AND user_id = :userId LIMIT 1`,
      { id: data.installmentId, userId: user.id },
    );
    if (!rows[0]) throw new Error("Parcela não encontrada");
    if (!rows[0].amount) throw new Error("Parcela sem valor");
    const amount = Number(rows[0].amount);
    const payDate = data.payment_date || new Date().toISOString().slice(0, 10);
    return registerBillPayment({
      installmentId: data.installmentId,
      debtId: data.debtId || rows[0].debt_id,
      amount,
      payment_date: payDate,
      payment_method: "Pix",
      is_full: true,
      notes: "Pagamento rápido (botão)",
      idempotencyKey: `quick-${data.installmentId}-${payDate}`,
    });
  });
