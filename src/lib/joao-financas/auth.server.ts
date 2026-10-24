import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getRequest } from "@tanstack/react-start/server";

import { getAdminSessionFromRequest } from "@/lib/auth.server";
import { ehJoaoAdmin } from "@/lib/visao-acesso";

import { query } from "./db.server";
import { getAuthSession, requireUser } from "./session.server";

const JOAO_EMAIL = "joao@minascalhas.local";
const JOAO_USERNAME = "joao";

type UserRow = RowDataPacket & {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  display_name: string | null;
};

export async function readCurrentUser() {
  const session = await getAuthSession();
  if (!session.data.userId) return null;
  return {
    id: session.data.userId,
    email: session.data.email,
    displayName: session.data.displayName || session.data.email?.split("@")[0] || "",
  };
}

function toUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function createUserAccount(input: {
  email: string;
  password: string;
  displayName?: string;
  username?: string;
  householdInviteCode?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const displayName = (input.displayName || email.split("@")[0]).trim();
  const username = toUsername(input.username || displayName);

  const existing = await query<UserRow[]>(
    `SELECT id FROM users
     WHERE email = :email OR username = :username
     LIMIT 1`,
    { email, username },
  );
  if (existing.length > 0) {
    throw new Error("Este e-mail ou usuário já está cadastrado");
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await query(
    `INSERT INTO users (id, email, username, password_hash, display_name)
     VALUES (:id, :email, :username, :passwordHash, :displayName)`,
    { id, email, username, passwordHash, displayName },
  );
  await query(`INSERT INTO profiles (id, display_name) VALUES (:id, :displayName)`, {
    id,
    displayName,
  });

  const { createHouseholdForUser, joinHouseholdByInviteCode } = await import("./household.server");
  if (input.householdInviteCode?.trim()) {
    await joinHouseholdByInviteCode(id, input.householdInviteCode);
  } else {
    await createHouseholdForUser(id, displayName ? `Família ${displayName}` : "Nossa casa");
  }

  return { ok: true as const };
}

export async function authenticateUser(input: { login: string; password: string }) {
  const login = input.login.trim();
  const loginLower = login.toLowerCase();

  const rows = await query<UserRow[]>(
    `SELECT id, email, username, password_hash, display_name FROM users
     WHERE email = :loginLower OR username = :loginLower
     LIMIT 1`,
    { loginLower },
  );
  const user = rows[0];
  const ok = user ? await bcrypt.compare(input.password, user.password_hash) : false;
  if (!user || !ok) {
    throw new Error("Usuário ou senha inválidos");
  }

  const session = await getAuthSession();
  const displayName = user.display_name || user.username || user.email.split("@")[0];
  await session.update({
    userId: user.id,
    email: user.email,
    displayName,
  });

  return {
    id: user.id,
    email: user.email,
    displayName,
  };
}

export async function clearAuthSession() {
  const session = await getAuthSession();
  await session.clear();
  return { ok: true as const };
}

export async function readProfile() {
  const user = await requireUser();
  const rows = await query<RowDataPacket[]>(
    "SELECT display_name FROM profiles WHERE id = :id LIMIT 1",
    { id: user.id },
  );
  return {
    displayName: (rows[0]?.display_name as string | undefined) || user.displayName,
    email: user.email,
  };
}

/** Garante usuário João no MySQL do módulo e abre a sessão (SSO do painel). */
async function ensureJoaoFinancasUser(displayName: string) {
  const existing = await query<UserRow[]>(
    `SELECT id, email, username, password_hash, display_name FROM users
     WHERE email = :email OR username = :username
     LIMIT 1`,
    { email: JOAO_EMAIL, username: JOAO_USERNAME },
  );

  if (existing[0]) {
    const user = existing[0];
    if (displayName && user.display_name !== displayName) {
      await query(`UPDATE users SET display_name = :displayName WHERE id = :id`, {
        id: user.id,
        displayName,
      });
      await query(`UPDATE profiles SET display_name = :displayName WHERE id = :id`, {
        id: user.id,
        displayName,
      });
    }
    return {
      id: user.id,
      email: user.email,
      displayName: displayName || user.display_name || user.username,
    };
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const name = displayName || "João";

  await query(
    `INSERT INTO users (id, email, username, password_hash, display_name)
     VALUES (:id, :email, :username, :passwordHash, :displayName)`,
    { id, email: JOAO_EMAIL, username: JOAO_USERNAME, passwordHash, displayName: name },
  );
  await query(`INSERT INTO profiles (id, display_name) VALUES (:id, :displayName)`, {
    id,
    displayName: name,
  });

  const { createHouseholdForUser } = await import("./household.server");
  await createHouseholdForUser(id, `Família ${name}`);

  return { id, email: JOAO_EMAIL, displayName: name };
}

/**
 * Entra no João Finanças usando a sessão admin do Minas Calhas (sem tela de login).
 * Só o admin João tem permissão.
 */
export async function enterFromAdminSession() {
  const request = getRequest();
  const admin = getAdminSessionFromRequest(request);
  if (!admin || admin.visao !== "admin" || !ehJoaoAdmin(admin)) {
    throw new Error("Acesso restrito ao administrador João.");
  }

  const current = await getAuthSession();
  if (current.data.userId && current.data.email) {
    return {
      id: current.data.userId,
      email: current.data.email,
      displayName: current.data.displayName || current.data.email.split("@")[0],
    };
  }

  const user = await ensureJoaoFinancasUser(admin.nome || "João");
  await current.update({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  });

  return user;
}
