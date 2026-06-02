/**
 * Importa dados do banco do site antigo (PHP) para o banco atual.
 *
 * Regras:
 * - Só INSERE registros que ainda não existem (mesmo id).
 * - Não altera nem apaga nada do dia de hoje no banco ATUAL.
 * - Do dia de hoje no legado: só entra o que ainda não existe no atual (ex.: visita/ponto faltando).
 *
 * Uso:
 *   1. Coloque credenciais do banco ANTIGO no .env (LEGACY_DB_*)
 *   2. node scripts/import-legado-db.mjs
 *   3. node scripts/import-legado-db.mjs --dry-run   (só mostra o que faria)
 *
 * Alternativa: arquivo .sql em scripts/dumps/legado.sql (use mysql client manualmente;
 * este script prefere conexão direta ao MySQL legado).
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const dryRun = process.argv.includes("--dry-run");

function dbUrl(prefix = "") {
  const p = prefix ? `${prefix}_` : "";
  const host = process.env[`${p}DB_HOST`] ?? process.env.DB_HOST;
  const port = process.env[`${p}DB_PORT`] ?? process.env.DB_PORT ?? "3306";
  const user = process.env[`${p}DB_USER`] ?? process.env.DB_USER;
  const pass = process.env[`${p}DB_PASSWORD`] ?? process.env.DB_PASSWORD;
  const name = process.env[`${p}DB_NAME`] ?? process.env.DB_NAME;
  if (!host || !user || !pass || !name) return null;
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`;
}

function int(v) {
  if (typeof v === "bigint") return Number(v);
  return Number(v) || 0;
}

/** Hoje em São Paulo (YYYY-MM-DD). */
function hojeSp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Normaliza data-visita do inventario para YYYY-MM-DD. */
function diaVisita(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return "";
}

function diaPonto(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    return `${raw.getUTCFullYear()}-${p(raw.getUTCMonth() + 1)}-${p(raw.getUTCDate())}`;
  }
  return "";
}

function esc(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
}

async function idsExistentes(prisma, tabela) {
  const rows = await prisma.$queryRawUnsafe(`SELECT id FROM ${tabela}`);
  return new Set(rows.map((r) => int(r.id)));
}

async function main() {
  const targetUrl = dbUrl();
  const legacyUrl = dbUrl("LEGACY");

  if (!targetUrl) {
    console.error("Configure DB_* no .env (banco atual).");
    process.exit(1);
  }
  if (!legacyUrl) {
    console.error(
      "Configure LEGACY_DB_HOST, LEGACY_DB_USER, LEGACY_DB_PASSWORD, LEGACY_DB_NAME no .env\n" +
        "(banco do site antigo). Ou me envie o dump .sql na pasta scripts/dumps/.",
    );
    process.exit(1);
  }

  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  const legacy = new PrismaClient({ datasources: { db: { url: legacyUrl } } });
  const hoje = hojeSp();

  console.log(dryRun ? "[DRY-RUN] " : "", `Hoje (SP): ${hoje}`);
  console.log("Origem: banco LEGACY → Destino: banco atual\n");

  try {
    await target.$connect();
    await legacy.$connect();

    const stats = {
      usuarios: { inseridos: 0, pulados: 0 },
      inventario: { inseridos: 0, pulados: 0, puladosHoje: 0 },
      ponto: { inseridos: 0, pulados: 0, puladosHoje: 0 },
      entregas: { inseridos: 0, pulados: 0, puladosHoje: 0 },
      entregaItens: { inseridos: 0, pulados: 0 },
    };

    // --- Usuários (funcionários) ---
    const idsUsuTarget = await idsExistentes(target, "usuarios");
    const usuLegado = await legacy.$queryRawUnsafe(`SELECT * FROM usuarios ORDER BY id`);
    const mapUsuarioId = new Map();

    for (const u of usuLegado) {
      const id = int(u.id);
      mapUsuarioId.set(id, id);
      if (idsUsuTarget.has(id)) {
        stats.usuarios.pulados++;
        continue;
      }
      if (!dryRun) {
        await target.$executeRawUnsafe(
          `INSERT INTO usuarios (id, thumb, nome, usuario, senha, email, nivel, valor_diario, fornecedor_id)
           VALUES (${id}, '${esc(u.thumb)}', '${esc(u.nome)}', '${esc(u.usuario)}', '${esc(u.senha)}',
                   '${esc(u.email)}', '${esc(u.nivel)}', ${Number(u.valor_diario) || 0},
                   ${u.fornecedor_id != null ? int(u.fornecedor_id) : "NULL"})`,
        );
      }
      stats.usuarios.inseridos++;
      idsUsuTarget.add(id);
    }
    console.log("Usuários:", stats.usuarios);

    // --- Visitas (inventario) ---
    const idsInvTarget = await idsExistentes(target, "inventario");
    const invLegado = await legacy.$queryRawUnsafe(`SELECT * FROM inventario ORDER BY id`);

    for (const row of invLegado) {
      const id = int(row.id);
      if (idsInvTarget.has(id)) {
        stats.inventario.pulados++;
        continue;
      }
      const funcId = row.funcionario != null ? int(row.funcionario) : "NULL";
      const sql = `INSERT INTO inventario (
        id, status, nome, telefone, \`cpf-cnpj\`, endereco, bairro, numero, cep,
        \`data-visita\`, \`hora-visita\`, observacao, funcionario, valor, desconto_percent,
        forma_pagamento, \`data-montagem\`, orcamento
      ) VALUES (
        ${id}, '${esc(row.status)}', '${esc(row.nome)}', '${esc(row.telefone)}',
        ${row["cpf-cnpj"] ? `'${esc(row["cpf-cnpj"])}'` : "NULL"},
        '${esc(row.endereco)}', '${esc(row.bairro)}', '${esc(row.numero)}', '${esc(row.cep)}',
        '${esc(row["data-visita"])}', '${esc(row["hora-visita"])}',
        ${row.observacao ? `'${esc(row.observacao)}'` : "NULL"},
        ${funcId}, ${Number(row.valor) || 0}, ${Number(row.desconto_percent) || 0},
        ${row.forma_pagamento ? `'${esc(row.forma_pagamento)}'` : "NULL"},
        ${row["data-montagem"] ? `'${esc(row["data-montagem"])}'` : "NULL"},
        ${row.orcamento ? `'${esc(row.orcamento)}'` : "NULL"}
      )`;

      if (!dryRun) await target.$executeRawUnsafe(sql);
      stats.inventario.inseridos++;
      idsInvTarget.add(id);
    }
    console.log("Visitas (inventario):", stats.inventario);

    // --- Bate-ponto ---
    const idsPontoTarget = await idsExistentes(target, "funcionario_ponto");
    const pontos = await legacy.$queryRawUnsafe(
      `SELECT * FROM funcionario_ponto ORDER BY registrado_em, id`,
    );

    for (const row of pontos) {
      const id = int(row.id);
      if (idsPontoTarget.has(id)) {
        stats.ponto.pulados++;
        continue;
      }
      const dia = diaPonto(row.registrado_em);
      const uid = int(row.usuario_id);
      const uidMap = mapUsuarioId.get(uid) ?? uid;

      const reg =
        row.registrado_em instanceof Date
          ? (() => {
              const p = (n) => String(n).padStart(2, "0");
              return `${row.registrado_em.getUTCFullYear()}-${p(row.registrado_em.getUTCMonth() + 1)}-${p(row.registrado_em.getUTCDate())} ${p(row.registrado_em.getUTCHours())}:${p(row.registrado_em.getUTCMinutes())}:${p(row.registrado_em.getUTCSeconds())}`;
            })()
          : esc(String(row.registrado_em).slice(0, 19).replace("T", " "));

      if (!dryRun) {
        await target.$executeRawUnsafe(
          `INSERT INTO funcionario_ponto (id, usuario_id, tipo, registrado_em)
           VALUES (${id}, ${uidMap}, '${esc(row.tipo)}', '${reg}')`,
        );
      }
      stats.ponto.inseridos++;
      if (dia === hoje) stats.ponto.puladosHoje++;
      idsPontoTarget.add(id);
    }
    console.log("Bate-ponto:", stats.ponto);

    // --- Entregas ---
    const idsEntTarget = await idsExistentes(target, "fornecedor_entregas");
    const entregas = await legacy.$queryRawUnsafe(`SELECT * FROM fornecedor_entregas ORDER BY id`);

    for (const row of entregas) {
      const id = int(row.id);
      if (idsEntTarget.has(id)) {
        stats.entregas.pulados++;
        continue;
      }
      const enviado = row.enviado_em;
      const dia =
        enviado instanceof Date
          ? `${enviado.getUTCFullYear()}-${String(enviado.getUTCMonth() + 1).padStart(2, "0")}-${String(enviado.getUTCDate()).padStart(2, "0")}`
          : diaPonto(enviado);

      const cols = [
        "id",
        "fornecedor_id",
        "usuario_id",
        "status",
        "observacao",
        "enviado_em",
        "recebido_em",
        "pagamento_status",
      ];
      const vals = cols.map((c) => {
        const v = row[c];
        if (v == null) return "NULL";
        if (v instanceof Date) {
          const p = (n) => String(n).padStart(2, "0");
          const dt = `'${v.getUTCFullYear()}-${p(v.getUTCMonth() + 1)}-${p(v.getUTCDate())} ${p(v.getUTCHours())}:${p(v.getUTCMinutes())}:${p(v.getUTCSeconds())}'`;
          return dt;
        }
        if (c === "usuario_id" || c === "fornecedor_id" || c === "id") return int(v);
        return `'${esc(v)}'`;
      });

      if (!dryRun) {
        await target.$executeRawUnsafe(
          `INSERT INTO fornecedor_entregas (${cols.join(", ")}) VALUES (${vals.join(", ")})`,
        );
      }
      stats.entregas.inseridos++;
      if (dia === hoje) stats.entregas.puladosHoje++;
      idsEntTarget.add(id);
    }
    console.log("Entregas:", stats.entregas);

    const idsItemTarget = await idsExistentes(target, "fornecedor_entrega_itens");
    const itens = await legacy.$queryRawUnsafe(`SELECT * FROM fornecedor_entrega_itens ORDER BY id`);

    for (const row of itens) {
      const id = int(row.id);
      if (idsItemTarget.has(id)) {
        stats.entregaItens.pulados++;
        continue;
      }
      if (!idsEntTarget.has(int(row.entrega_id))) {
        stats.entregaItens.pulados++;
        continue;
      }
      if (!dryRun) {
        await target.$executeRawUnsafe(
          `INSERT INTO fornecedor_entrega_itens (
            id, entrega_id, material_id, metros, valor_unitario, observacao, recebido,
            pagamento_status, pagamento_confirmado_forn
          ) VALUES (
            ${id}, ${int(row.entrega_id)}, ${int(row.material_id)},
            ${Number(row.metros) || 0}, ${Number(row.valor_unitario) || 0},
            ${row.observacao ? `'${esc(row.observacao)}'` : "NULL"},
            ${int(row.recebido) || 0},
            ${row.pagamento_status ? `'${esc(row.pagamento_status)}'` : "NULL"},
            ${int(row.pagamento_confirmado_forn) || 0}
          )`,
        );
      }
      stats.entregaItens.inseridos++;
    }
    console.log("Itens de entrega:", stats.entregaItens);

    console.log("\nConcluído.", dryRun ? "Rode sem --dry-run para aplicar." : "");
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await target.$disconnect();
    await legacy.$disconnect();
  }
}

main();
