import { config as loadEnv } from "dotenv";
import { useSession } from "@tanstack/react-start/server";

loadEnv();

export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
};

function sessionPassword() {
  const secret =
    process.env.JOAO_FINANCAS_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "Defina JOAO_FINANCAS_SESSION_SECRET (ou SESSION_SECRET / AUTH_SECRET) com ao menos 32 caracteres no .env.",
    );
  }
  return secret;
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
