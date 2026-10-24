import { config as loadEnv } from "dotenv";
import { useSession } from "@tanstack/react-start/server";

loadEnv();

export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
};

function sessionPassword() {
  const raw =
    process.env.JOAO_FINANCAS_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "Defina JOAO_FINANCAS_SESSION_SECRET (ou AUTH_SECRET) nas variáveis da Vercel.",
    );
  }
  // useSession exige >= 32 chars; completa de forma determinística se AUTH_SECRET for curto
  if (raw.length >= 32) return raw;
  return (raw + ":" + raw.repeat(4)).slice(0, 64);
}

export async function getAuthSession() {
  return useSession<AuthSession>({
    name: "joao_financas_session",
    password: sessionPassword(),
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  });
}

export async function requireUser() {
  const session = await getAuthSession();
  const { userId, email, displayName } = session.data;
  if (!userId || !email) {
    throw new Error("Não autenticado");
  }
  return {
    id: userId,
    email,
    displayName: displayName || email.split("@")[0],
  };
}
