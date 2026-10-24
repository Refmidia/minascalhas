import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { readCurrentUser } = await import("./auth.server");
  return readCurrentUser();
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      displayName: z.string().optional(),
      username: z.string().optional(),
      householdInviteCode: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { createUserAccount } = await import("./auth.server");
    return createUserAccount(data);
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      login: z.string().min(1),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { authenticateUser } = await import("./auth.server");
    return authenticateUser(data);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { clearAuthSession } = await import("./auth.server");
  return clearAuthSession();
});

export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { readProfile } = await import("./auth.server");
  return readProfile();
});

/** SSO: painel Minas Calhas (admin João) → sessão João Finanças. */
export const enterJoaoFinancas = createServerFn({ method: "POST" }).handler(async () => {
  const { enterFromAdminSession } = await import("./auth.server");
  return enterFromAdminSession();
});
