import type { RowDataPacket } from "mysql2";
import { query } from "./db.server";
import { requireUser } from "./session.server";

/** Filtro SQL: registros de qualquer membro do household. */
export const householdUserScope = `user_id IN (
  SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId
)`;

let schemaReady: Promise<void> | null = null;

function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Cria tabelas de família e vincula usuários existentes (idempotente). */
export async function ensureHouseholdSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS households (
          id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL DEFAULT 'Nossa casa',
          invite_code VARCHAR(12) NOT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY households_invite_uq (invite_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS household_members (
          household_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'member',
          joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id),
          KEY household_members_household_idx (household_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const users = await query<RowDataPacket[]>(
        `SELECT u.id, u.display_name, u.email
         FROM users u
         LEFT JOIN household_members hm ON hm.user_id = u.id
         WHERE hm.user_id IS NULL`,
      );

      for (const user of users) {
        await insertHouseholdForUser(
          user.id as string,
          user.display_name
            ? `Família ${user.display_name as string}`
            : `Família ${(user.email as string).split("@")[0]}`,
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

type HouseholdRow = RowDataPacket & {
  id: string;
  name: string;
  invite_code: string;
};

type MemberRow = RowDataPacket & {
  user_id: string;
  display_name: string | null;
  email: string;
  role: string;
};

export async function resolveHouseholdId(userId: string): Promise<string> {
  await ensureHouseholdSchema();

  const rows = await query<RowDataPacket[]>(
    `SELECT household_id FROM household_members WHERE user_id = :userId LIMIT 1`,
    { userId },
  );
  if (rows[0]?.household_id) return rows[0].household_id as string;

  // Fallback: cria household solo (migração / usuários antigos)
  return insertHouseholdForUser(userId);
}

async function insertHouseholdForUser(userId: string, name = "Nossa casa") {
  const existing = await query<RowDataPacket[]>(
    `SELECT household_id FROM household_members WHERE user_id = :userId LIMIT 1`,
    { userId },
  );
  if (existing[0]?.household_id) return existing[0].household_id as string;

  const id = crypto.randomUUID();
  let inviteCode = randomInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await query<RowDataPacket[]>(
      `SELECT id FROM households WHERE invite_code = :code LIMIT 1`,
      { code: inviteCode },
    );
    if (!clash.length) break;
    inviteCode = randomInviteCode();
  }

  await query(
    `INSERT INTO households (id, name, invite_code, created_by)
     VALUES (:id, :name, :inviteCode, :createdBy)`,
    { id, name, inviteCode, createdBy: userId },
  );
  await query(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES (:householdId, :userId, 'owner')`,
    { householdId: id, userId },
  );
  return id;
}

export async function createHouseholdForUser(userId: string, name = "Nossa casa") {
  await ensureHouseholdSchema();
  return insertHouseholdForUser(userId, name);
}

export async function joinHouseholdByInviteCode(userId: string, inviteCode: string) {
  await ensureHouseholdSchema();

  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error("Informe o código de convite da família");

  const households = await query<HouseholdRow[]>(
    `SELECT id, name, invite_code FROM households WHERE invite_code = :code LIMIT 1`,
    { code },
  );
  const household = households[0];
  if (!household) throw new Error("Código de convite inválido");

  const current = await query<RowDataPacket[]>(
    `SELECT household_id FROM household_members WHERE user_id = :userId LIMIT 1`,
    { userId },
  );
  const currentHouseholdId = current[0]?.household_id as string | undefined;

  if (currentHouseholdId === household.id) {
    return { householdId: household.id, name: household.name };
  }

  if (currentHouseholdId) {
    const memberCount = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM household_members WHERE household_id = :householdId`,
      { householdId: currentHouseholdId },
    );
    if (Number(memberCount[0]?.c) > 1) {
      throw new Error("Você já participa de uma família. Saia antes de entrar em outra.");
    }
    // Household solo vazio — remove para entrar na família do cônjuge
    await query(`DELETE FROM household_members WHERE user_id = :userId`, { userId });
    await query(`DELETE FROM households WHERE id = :id`, { id: currentHouseholdId });
  }

  await query(
    `INSERT INTO household_members (household_id, user_id, role)
     VALUES (:householdId, :userId, 'member')`,
    { householdId: household.id, userId },
  );

  return { householdId: household.id, name: household.name };
}

export async function requireHousehold() {
  const user = await requireUser();
  const householdId = await resolveHouseholdId(user.id);
  return { user, householdId };
}

export async function readHouseholdSummary() {
  const { user, householdId } = await requireHousehold();
  const households = await query<HouseholdRow[]>(
    `SELECT id, name, invite_code FROM households WHERE id = :householdId LIMIT 1`,
    { householdId },
  );
  const household = households[0];
  if (!household) throw new Error("Família não encontrada");

  const members = await query<MemberRow[]>(
    `SELECT hm.user_id, hm.role, u.display_name, u.email
     FROM household_members hm
     INNER JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id = :householdId
     ORDER BY hm.joined_at ASC`,
    { householdId },
  );

  return {
    id: household.id,
    name: household.name,
    inviteCode: household.invite_code,
    isOwner: members.some((m) => m.user_id === user.id && m.role === "owner"),
    members: members.map((m) => ({
      id: m.user_id,
      name: m.display_name || m.email.split("@")[0],
      email: m.email,
      role: m.role,
      isYou: m.user_id === user.id,
    })),
  };
}
